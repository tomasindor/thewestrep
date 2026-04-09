export interface ImageVariantsManifest {
  original: string;
  variants: {
    thumb?: string;
    cartThumb?: string;
    card?: string;
    detail?: string;
    lightbox?: string;
    adminPreview?: string;
  };
  width: number;
  height: number;
}
