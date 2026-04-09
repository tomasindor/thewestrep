export interface CloudinaryImageTransform {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit";
  gravity?: "auto";
  quality?: "auto" | string;
  format?: "auto" | string;
  dpr?: "auto" | string;
}

function normalizePublicId(publicId: string) {
  return publicId.replace(/^\/+/, "");
}

function encodePublicId(publicId: string) {
  return normalizePublicId(publicId)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function isCloudinaryAssetUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function buildCloudinaryImageUrl(cloudName: string, publicId: string, transform: CloudinaryImageTransform = {}) {
  const transformation = [
    transform.crop ? `c_${transform.crop}` : null,
    transform.gravity ? `g_${transform.gravity}` : null,
    transform.width ? `w_${transform.width}` : null,
    transform.height ? `h_${transform.height}` : null,
    transform.quality ? `q_${transform.quality}` : null,
    transform.format ? `f_${transform.format}` : null,
    transform.dpr ? `dpr_${transform.dpr}` : null,
  ]
    .filter(Boolean)
    .join(",");

  const path = encodePublicId(publicId);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${path}`;
}
