import type { MetadataRoute } from "next";

import { getCatalogProducts } from "@/lib/catalog";
import { getProductPath } from "@/lib/catalog/models";
import { getAbsoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stockProducts, encargueProducts] = await Promise.all([
    getCatalogProducts({ availability: "stock" }),
    getCatalogProducts({ availability: "encargue" }),
  ]);

  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: getAbsoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: getAbsoluteUrl("/catalogo"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: getAbsoluteUrl("/stock"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: getAbsoluteUrl("/encargue"), lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: getAbsoluteUrl("/consultas"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const productRoutes = [...stockProducts, ...encargueProducts].map((product) => ({
    url: getAbsoluteUrl(getProductPath(product)),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
