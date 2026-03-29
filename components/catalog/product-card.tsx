import Link from "next/link";

import { SmartImage } from "@/components/ui/smart-image";
import { getProductPath, type CatalogProduct } from "@/lib/catalog";

function getAvailabilityClassName(availability: CatalogProduct["availability"]) {
  if (availability === "stock") {
    return "border-emerald-400/25 bg-emerald-500/12 text-emerald-50";
  }

  return "border-orange-300/25 bg-orange-500/12 text-orange-50";
}

function getCommercialHighlights(product: CatalogProduct) {
  const highlights = [product.note];

  if (product.sizes?.length) {
    highlights.push(`${product.sizes.length} ${product.sizes.length === 1 ? "talle" : "talles"}`);
  }

  if (product.variants?.length) {
    highlights.push(`${product.variants.length} ${product.variants.length === 1 ? "variante" : "variantes"}`);
  }

  return highlights;
}

interface ProductCardProps {
  product: CatalogProduct;
  variant?: "default" | "home";
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const detailHref = getProductPath(product);
  const isHomeCard = variant === "home";
  const commercialHighlights = getCommercialHighlights(product);
  const cardContent = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden border-b border-white/10 bg-black/20">
        <SmartImage
          src={product.image}
          alt={product.alt}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 1280px) 50vw, 30vw"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-white/72 uppercase backdrop-blur-sm">
            {product.brand.name}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase backdrop-blur-sm ${getAvailabilityClassName(product.availability)}`}
            >
              {product.availabilityLabel}
            </span>
            {product.badge ? (
              <span className="rounded-full border border-orange-300/25 bg-orange-500/12 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-orange-50 uppercase backdrop-blur-sm">
                {product.badge.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/75">
            {product.category.name}
          </span>
          <p className="text-xl font-semibold text-orange-100 sm:text-2xl">{product.pricing.display}</p>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xl font-semibold leading-tight text-white sm:text-2xl">{product.name}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-slate-300">{product.detail}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {commercialHighlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] tracking-[0.18em] text-white/72 uppercase"
            >
              {highlight}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-sm font-medium text-orange-100">
          <span>{isHomeCard ? "Ver producto" : "Abrir detalle"}</span>
          <span aria-hidden="true" className="text-lg transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </>
  );

  return (
    <Link
      href={detailHref}
      aria-label={`Ver detalle de ${product.name}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {cardContent}
    </Link>
  );
}
