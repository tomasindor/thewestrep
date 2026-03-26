export const siteConfig = {
  name: "thewestrep",
  title: "thewestrep | Stock inmediato y encargues internacionales",
  description:
    "Landing premium para thewestrep: moda importada, stock inmediato, encargues internacionales y atención directa por WhatsApp.",
  url: "https://thewestrep.vercel.app",
  locale: "es",
  whatsappUrl: "https://wa.me/?text=",
} as const;

export type SiteConfig = typeof siteConfig;
