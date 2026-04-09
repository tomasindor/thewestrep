export const brandLogoPaths = {
  nike: "/brand-logos/nike.png",
  adidas: "/brand-logos/adidas.png",
  essentials: "/brand-logos/essentials.png",
  gucci: "/brand-logos/gucci.png",
  "louis-vuitton": "/brand-logos/louis-vuitton.png",
  bape: "/brand-logos/bape.png",
  burberry: "/brand-logos/burberry.png",
  corteiz: "/brand-logos/corteiz.svg",
  "carhartt-wip": "/brand-logos/carhartt-wip.svg",
  "new-era": "/brand-logos/new-era.png",
  "fear-of-god": "/brand-logos/fear-of-god.svg",
  "palm-angels": "/brand-logos/palm-angels.svg",
  "off-white": "/brand-logos/off-white.svg",
  casablanca: "/brand-logos/casablanca.svg",
  rhude: "/brand-logos/rhude.svg",
  "ralph-lauren": "/brand-logos/ralph-lauren.png",
  stussy: "/brand-logos/stussy.png",
  "chrome-hearts": "/brand-logos/chrome-hearts.svg",
  lacoste: "/brand-logos/lacoste.png",
  moncler: "/brand-logos/moncler.svg",
} as const;

export function getBrandLogoPath(slug: string) {
  return brandLogoPaths[slug as keyof typeof brandLogoPaths];
}
