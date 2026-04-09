import { NextRequest, NextResponse } from "next/server";

// Configuración del proxy: intercepta todas las rutas /api/*
export const config = {
  matcher: "/api/:path*",
};

// Rutas que no requieren validación CSRF
const skipPaths = [
  /^\/api\/auth\//,
  /^\/api\/customer-auth\/register$/,
];

// Métodos HTTP seguros (no requieren validación CSRF)
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Verifica si la ruta actual debe saltarse la validación CSRF.
 */
function isSkippedPath(pathname: string): boolean {
  return skipPaths.some((pattern) => pattern.test(pathname));
}

/**
 * Valida si el origen de la request es válido (evita CSRF).
 */
function isOriginValid(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  const nextauthUrl = process.env.NEXTAUTH_URL;

  const allowedHosts = [
    host,
    nextauthUrl ? new URL(nextauthUrl).host : null,
  ].filter((h): h is string => h !== null);

  // Validar Origin header (prioridad)
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return allowedHosts.includes(originHost);
    } catch {
      return false;
    }
  }

  // Validar Referer header (fallback)
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return allowedHosts.includes(refererHost);
    } catch {
      return false;
    }
  }

  // Si no hay Origin ni Referer, rechazar (protección CSRF)
  return false;
}

/**
 * Proxy principal: valida requests a /api/* para evitar CSRF.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Saltar rutas públicas o de autenticación
  if (isSkippedPath(pathname)) {
    return NextResponse.next();
  }

  // Saltar métodos seguros (GET, HEAD, OPTIONS)
  if (safeMethods.has(request.method)) {
    return NextResponse.next();
  }

  // Validar origen para métodos que modifican estado (POST, PUT, DELETE, etc.)
  if (!isOriginValid(request)) {
    const origin = request.headers.get("origin") ?? "missing";
    const host = request.headers.get("host") ?? "missing";

    console.warn(
      JSON.stringify({
        event: "csrf_blocked",
        origin,
        host,
        path: pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json(
      { error: "Forbidden: invalid origin or referer" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}