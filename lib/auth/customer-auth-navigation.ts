export function sanitizeAuthReturnUrl(value: string | null | undefined, fallback = "/") {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function buildAuthEntryHref(basePath: "/login" | "/register", returnUrl: string | null | undefined) {
  const safeReturnUrl = sanitizeAuthReturnUrl(returnUrl, "/checkout");
  const params = new URLSearchParams({ returnUrl: safeReturnUrl });
  return `${basePath}?${params.toString()}`;
}
