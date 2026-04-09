import type { Metadata } from "next";

import type { CatalogProduct } from "@/lib/catalog";
import { getProductPath } from "@/lib/catalog/models";
import { getAbsoluteUrl, siteConfig } from "@/lib/site";

const defaultKeywords = [
  "thewestrep",
  "streetwear importado",
  "stock inmediato",
  "encargue internacional asistido",
  "catálogo streetwear",
  "ropa importada argentina",
];

function getOpenGraphImages(imagePath?: string, alt?: string) {
  return [
    {
      url: imagePath ?? siteConfig.defaultOgImage,
      width: 1200,
      height: 630,
      alt: alt ?? siteConfig.title,
    },
  ];
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
}: {
  title?: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const canonical = path || "/";
  const socialTitle = title ? `${title} | ${siteConfig.shortTitle}` : siteConfig.title;

  return {
    title,
    description,
    keywords: [...defaultKeywords, ...(keywords ?? [])],
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: socialTitle,
      description,
      siteName: siteConfig.shortTitle,
      locale: siteConfig.ogLocale,
      images: getOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [siteConfig.defaultOgImage],
    },
  };
}

export function createProductMetadata(product: CatalogProduct): Metadata {
  const path = getProductPath(product);
  const description = `${product.name} de ${product.brand.name} en ${product.availabilityLabel.toLowerCase()} en thewestrep. ${product.detail}`;

  return {
    title: `${product.name} | ${product.brand.name}`,
    description,
    keywords: [...defaultKeywords, product.name, product.brand.name, product.category.name, product.availabilityLabel],
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      title: `${product.name} | ${siteConfig.shortTitle}`,
      description,
      siteName: siteConfig.shortTitle,
      locale: siteConfig.ogLocale,
      images: getOpenGraphImages(product.image, product.alt),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ${siteConfig.shortTitle}`,
      description,
      images: [getAbsoluteUrl(product.image)],
    },
  };
}

export function sanitizeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
