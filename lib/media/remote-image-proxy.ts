const ALLOWED_HOSTS = new Set(["photo.yupoo.com"]);

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isYupooPhotoUrl(value: string) {
  const parsed = parseUrl(value);

  return parsed?.protocol === "https:" && parsed.hostname === "photo.yupoo.com";
}

export function shouldProxyRemoteImage(value: string) {
  return isYupooPhotoUrl(value);
}

export function buildRemoteImageProxyUrl(value: string) {
  const params = new URLSearchParams({ url: value });
  return `/api/image-proxy?${params.toString()}`;
}

export function buildYupooReferer(value: string) {
  if (!isYupooPhotoUrl(value)) {
    return undefined;
  }

  const parsed = new URL(value);
  const albumOwner = parsed.pathname.split("/").filter(Boolean)[0]?.trim();

  if (!albumOwner) {
    return undefined;
  }

  return `https://${albumOwner}.x.yupoo.com/`;
}

export function isValidImageUrl(value: string): boolean {
  const parsed = parseUrl(value);
  if (!parsed) return false;
  if (parsed.protocol !== "https:") return false;
  return ALLOWED_HOSTS.has(parsed.hostname);
}

export function validateRedirectUrl(originalUrl: string, redirectUrl: string): boolean {
  const original = parseUrl(originalUrl);
  const redirect = parseUrl(redirectUrl);
  if (!original || !redirect) return false;
  return redirect.hostname === original.hostname;
}
