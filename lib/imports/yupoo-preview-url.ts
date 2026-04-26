export function toYupooPreviewAssetUrl(candidate: string) {
  const trimmed = candidate.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const pathname = parsed.pathname;

  if (/_small\.(jpe?g|png|webp)$/i.test(pathname)) {
    return parsed.href;
  }

  parsed.pathname = pathname.replace(/\.(jpe?g|png|webp)$/i, "_small.$1");
  return parsed.href;
}
