export const siteConfig = {
  name: "thewestrep",
  title: "thewestrep | Streetwear importado, stock inmediato y encargue internacional asistido",
  shortTitle: "thewestrep",
   description:
     "Streetwear importado con stock inmediato y encargue internacional asistido. Nosotros hacemos la importación y luego despachamos localmente desde Argentina, sin trámites aduaneros ni impuestos sorpresa para vos. Encargamos a nuestros proveedores y coordinamos la entrega desde nuestro depósito local.",
  url: "https://thewestrep.vercel.app",
  locale: "es",
  ogLocale: "es_AR",
  defaultOgImage: "/destacada.png",
  whatsappUrl: "https://wa.me/?text=",
} as const;

export type SiteConfig = typeof siteConfig;

export function getAbsoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function getWhatsAppHref(message: string) {
  return `${siteConfig.whatsappUrl}${encodeURIComponent(message)}`;
}
