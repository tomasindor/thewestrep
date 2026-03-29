import type { Category } from "@/lib/catalog/types";

export const categories = [
  {
    id: "hoodies",
    name: "Hoodies",
    slug: "hoodies",
    description: "Básicos, logos y fit relajado.",
    image: "/bape.jpg",
    alt: "Hoodie de muestra para thewestrep",
    featuredOnHomepage: true,
    featuredOnHero: true,
  },
  {
    id: "tees",
    name: "Tees",
    slug: "tees",
    description: "Remeras gráficas y esenciales.",
    image: "/demo-tee.svg",
    alt: "Remera de muestra para thewestrep",
    featuredOnHomepage: true,
  },
  {
    id: "accesorios",
    name: "Accesorios",
    slug: "accesorios",
    description: "Gorras y piezas para completar el look.",
    image: "/demo-cap.svg",
    alt: "Gorra de muestra para thewestrep",
    featuredOnHomepage: true,
  },
  {
    id: "outerwear",
    name: "Outerwear",
    slug: "outerwear",
    description: "Camperas y capas para búsquedas puntuales.",
    image: "/Corteiz.webp",
    alt: "Campera de muestra para thewestrep",
    featuredOnHomepage: true,
  },
] satisfies readonly Category[];
