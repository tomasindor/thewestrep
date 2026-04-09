import type { NextRequest } from "next/server";

import { buildYupooReferer, shouldProxyRemoteImage, validateRedirectUrl } from "@/lib/media/remote-image-proxy";
import { logger } from "@/lib/logger";
import { getCachedImage, saveImageToCache } from "@/lib/media/image-cache";
import { rateLimiter } from "@/lib/security/rate-limiter";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB

function logSecurityEvent(event: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      ...fields,
      timestamp: new Date().toISOString(),
    }),
  );
}

function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request);
  const sourceUrl = request.nextUrl.searchParams.get("url")?.trim();

  // Rate limiting check
  if (!rateLimiter.isAllowed(ip)) {
    const retryAfterMs = rateLimiter.getRetryAfter(ip);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    logSecurityEvent("rate_limit_exceeded", { ip });

    return new Response("Rate limit exceeded.", {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    });
  }

  if (!sourceUrl) {
    return new Response("Missing image url.", { status: 400 });
  }

  if (!shouldProxyRemoteImage(sourceUrl)) {
    logSecurityEvent("invalid_url", { ip, url: sourceUrl, reason: "not an allowed Yupoo URL" });
    return new Response("Unsupported image host.", { status: 400 });
  }

  // 1. Intentar servir desde cache local
  const cached = await getCachedImage(sourceUrl);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=604800, stale-while-revalidate=86400",
        "x-cache": "HIT",
      },
    });
  }

  // 2. Cache miss - fetch desde Yupoo with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(sourceUrl, {
      headers: {
        "user-agent": "thewestrep-image-proxy/1.0",
        ...(buildYupooReferer(sourceUrl) ? { referer: buildYupooReferer(sourceUrl)! } : {}),
      },
      signal: controller.signal,
      redirect: "manual",
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      logSecurityEvent("fetch_timeout", { ip, url: sourceUrl, elapsed_ms: FETCH_TIMEOUT_MS });
      return new Response("Gateway timeout.", { status: 504 });
    }
    return new Response("Unable to fetch image.", { status: 502 });
  }

  clearTimeout(timeoutId);

  // Handle redirects manually
  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
    const location = upstreamResponse.headers.get("location");
    if (!location) {
      return new Response("Unable to fetch image.", { status: 502 });
    }

    if (!validateRedirectUrl(sourceUrl, location)) {
      logSecurityEvent("redirect_blocked", { ip, url: sourceUrl, redirect_to: location });
      return new Response("Redirect to non-allowed host blocked.", { status: 403 });
    }

    // Follow redirect on the allowed host
    try {
      const redirectController = new AbortController();
      const redirectTimeoutId = setTimeout(() => redirectController.abort(), FETCH_TIMEOUT_MS);

      upstreamResponse = await fetch(location, {
        headers: {
          "user-agent": "thewestrep-image-proxy/1.0",
          ...(buildYupooReferer(location) ? { referer: buildYupooReferer(location)! } : {}),
        },
        signal: redirectController.signal,
        redirect: "manual",
      });

      clearTimeout(redirectTimeoutId);

      // Check for another redirect
      if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
        const nextLocation = upstreamResponse.headers.get("location");
        if (nextLocation && !validateRedirectUrl(sourceUrl, nextLocation)) {
          logSecurityEvent("redirect_blocked", { ip, url: sourceUrl, redirect_to: nextLocation });
          return new Response("Redirect to non-allowed host blocked.", { status: 403 });
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        logSecurityEvent("fetch_timeout", { ip, url: location, elapsed_ms: FETCH_TIMEOUT_MS });
        return new Response("Gateway timeout.", { status: 504 });
      }
      return new Response("Unable to fetch image.", { status: 502 });
    }
  }

  if (!upstreamResponse.ok) {
    return new Response("Unable to fetch image.", { status: 502 });
  }

  const contentType = upstreamResponse.headers.get("content-type")?.split(";")[0].trim().toLowerCase();

  if (!contentType?.startsWith("image/")) {
    return new Response("Upstream did not return an image.", { status: 502 });
  }

  // 3. Stream response with size check
  if (!upstreamResponse.body) {
    return new Response("Unable to fetch image.", { status: 502 });
  }

  const reader = upstreamResponse.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        logSecurityEvent("response_too_large", { ip, url: sourceUrl, size: totalBytes });
        await reader.cancel();
        return new Response("Response too large.", { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return new Response("Unable to fetch image.", { status: 502 });
  }

  const imageData = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    imageData.set(chunk, offset);
    offset += chunk.byteLength;
  }

  // Guardar en cache en background (no esperamos)
  saveImageToCache(sourceUrl, Buffer.from(imageData), contentType).catch((err) =>
    logger.warn("image_cache_save_failed", { url: sourceUrl, error: err instanceof Error ? err.message : String(err) }),
  );

  const cacheControl = upstreamResponse.headers.get("cache-control") ?? "public, max-age=604800, stale-while-revalidate=86400";

  return new Response(imageData, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": cacheControl,
      "x-cache": "MISS",
    },
  });
}
