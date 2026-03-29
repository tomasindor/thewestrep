export const SUPPORTED_PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

export type SupportedProductSize = (typeof SUPPORTED_PRODUCT_SIZES)[number];

export const PRODUCT_STATE_LABELS = {
  draft: "Oculto",
  published: "Publicado",
  paused: "Pausado",
} as const;

export const PRODUCT_STATE_HELPERS = {
  draft: "No aparece en la tienda pública. Sirve para cargarlo tranquilo antes de mostrarlo.",
  published: "Ya está visible en la tienda y se puede compartir.",
  paused: "Se deja de mostrar al público sin borrar el producto.",
} as const;
