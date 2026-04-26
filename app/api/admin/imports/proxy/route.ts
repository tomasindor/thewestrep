import { parseYupooUrl } from "@/lib/imports/ingestion";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceCandidate = searchParams.get("url")?.trim() ?? "";
  const previewCandidate = searchParams.get("previewUrl")?.trim() ?? "";

  if (!sourceCandidate) {
    return new Response("Missing url", { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = parseYupooUrl(sourceCandidate);
  } catch {
    return new Response("Invalid Yupoo url", { status: 400 });
  }

  let previewUrl: URL | null = null;

  if (previewCandidate) {
    try {
      previewUrl = parseYupooUrl(previewCandidate);
    } catch {
      previewUrl = null;
    }
  }

  const fetchTargets = previewUrl && previewUrl.href !== sourceUrl.href
    ? [previewUrl.href, sourceUrl.href]
    : [sourceUrl.href];

  let fallbackStatus = 502;

  for (const targetUrl of fetchTargets) {
    const upstream = await fetch(targetUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)",
        referer: "https://x.yupoo.com/",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      fallbackStatus = upstream.status;
      continue;
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  }

  return new Response("Upstream image unavailable", { status: fallbackStatus });
}
