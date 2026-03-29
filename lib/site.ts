export const siteConfig = {
  name: "thewestrep",
  title: "thewestrep | Streetwear importado, stock inmediato y encargues internacionales",
  description:
    "Streetwear importado con stock inmediato y encargues internacionales. Impuestos incluidos, sin trámites después del pago y envío coordinado por WhatsApp.",
  url: "https://thewestrep.vercel.app",
  locale: "es",
  whatsappUrl: "https://wa.me/?text=",
} as const;

export type SiteConfig = typeof siteConfig;
