import type { Brand } from "@/lib/catalog/types";

export const brands: readonly Brand[] = [
  { id: "essentials", name: "Essentials", slug: "essentials", featuredOnHomepage: true },
  { id: "bape", name: "Bape", slug: "bape", image: "/bape.jpg", alt: "Bape", featuredOnHomepage: true },
  { id: "stussy", name: "Stüssy", slug: "stussy", featuredOnHomepage: true },
  { id: "new-era", name: "New Era", slug: "new-era", featuredOnHomepage: true },
  { id: "corteiz", name: "Corteiz", slug: "corteiz", image: "/Corteiz.webp", alt: "Corteiz", featuredOnHomepage: true },
  { id: "carhartt-wip", name: "Carhartt WIP", slug: "carhartt-wip", featuredOnHomepage: true },
];
