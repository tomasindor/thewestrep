import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isBypassedPath(pathname: string) {
  return pathname.startsWith("/api/auth/") || pathname === "/api/customer-auth/register";
}

function getHostCandidate(request: NextRequest) {
  return request.headers.get("host") ?? request.nextUrl.host;
}

function getOriginCandidate(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(request: NextRequest, origin: string | null) {
  if (!origin) {
    return false;
  }

  const host = getHostCandidate(request);
  const sameHostOrigin = `https://${host}`;
  if (origin === sameHostOrigin) {
    return true;
  }

  const nextAuthOrigin = process.env.NEXTAUTH_URL;
  return Boolean(nextAuthOrigin && origin === nextAuthOrigin);
}

export function proxy(request: NextRequest) {
  if (!PROTECTED_METHODS.has(request.method) || isBypassedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const origin = getOriginCandidate(request);

  if (!isAllowedOrigin(request, origin)) {
    return NextResponse.json({ error: "Forbidden: invalid origin" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
