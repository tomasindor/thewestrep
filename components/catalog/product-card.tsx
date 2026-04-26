import Link from "next/link";

import { ComboBadge } from "@/components/catalog/combo-badge";
import { SmartImage } from "@/components/ui/smart-image";
import { getProductPath, type CatalogProduct } from "@/lib/catalog/models";
import { getProductImageUrlForContext } from "@/lib/media/product-images";

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

function isContextRedundantBadge(
  badgeLabel: string,
  productAvailability: CatalogProduct["availability"],
  contextAvailability?: CatalogProduct["availability"],
) {
  if (!contextAvailability || contextAvailability !== productAvailability) {
    return false;
  }

  const normalizedLabel = normalizeLabel(badgeLabel);

  if (productAvailability === "stock") {
    return normalizedLabel === "stock" || normalizedLabel === "stock inmediato";
  }

  return normalizedLabel === "encargue" || normalizedLabel === "a pedido";
}

interface ProductCardProps {
  product: CatalogProduct;
  variant?: "default" | "home" | "related";
  contextAvailability?: CatalogProduct["availability"];
  pairedProductName?: string;
}

export function ProductCard({ product, variant = "default", contextAvailability, pairedProductName }: ProductCardProps) {
  const detailHref = getProductPath(product);
  const isHomeCard = variant === "home";
  const isRelatedCard = variant === "related";
  const isCompactCard = isHomeCard || isRelatedCard;
  const cardImage = product.gallery.find((image) => image.role === "cover") ?? product.gallery[0];
  const showAvailabilityLabel = contextAvailability !== product.availability;
  const visibleBadge =
    product.badge && !isContextRedundantBadge(product.badge.label, product.availability, contextAvailability)
      ? product.badge
      : undefined;
  const priceClassName = isCompactCard
    ? "text-[#f4d7e0] drop-shadow-[0_10px_24px_rgba(210,138,163,0.18)]"
    : "border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.12)] text-[#f7e5eb] shadow-[0_10px_28px_rgba(210,138,163,0.14)]";
  const cardContent = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_42%),linear-gradient(180deg,rgba(7,9,14,0.08),rgba(7,9,14,0.34))]">
        <div className="absolute -inset-px overflow-hidden">
          <SmartImage
            src={cardImage ? getProductImageUrlForContext(cardImage, "card") : product.image}
            alt={cardImage?.alt ?? product.alt}
            fill
            className="h-full w-full object-cover transform-gpu transition duration-700 will-change-transform group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 20vw, 18vw"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,8,0.02)_0%,rgba(4,5,8,0.14)_48%,rgba(4,5,8,0.62)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,rgba(210,138,163,0.16),transparent_62%)] opacity-70 transition duration-300 group-hover:opacity-100" />

        {!isCompactCard ? (
          <div className="absolute inset-x-0 top-0 flex justify-end p-4">
            <div className="flex flex-wrap justify-end gap-2">
              {showAvailabilityLabel ? (
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase backdrop-blur-sm ${
                    product.availability === "stock"
                      ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-50"
                      : "border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.12)] text-[#f6dbe4]"
                  }`}
                >
                  {product.availabilityLabel}
                </span>
              ) : null}
              {visibleBadge ? (
                <span className="rounded-full border border-[rgba(210,138,163,0.3)] bg-[rgba(14,10,14,0.58)] px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[#f6dbe4] uppercase shadow-[0_10px_26px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                  {visibleBadge.label}
                </span>
              ) : null}
              <ComboBadge comboEligible={product.comboEligible} pairedProductName={pairedProductName} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium tracking-[0.24em] text-white/68 uppercase">
            <span className="text-[#f2d4dd]/90">{product.brand.name}</span>
            <span aria-hidden="true" className="text-white/25">
              /
            </span>
            <span>{product.category.name}</span>
          </div>

          {isCompactCard ? (
            <div className="flex flex-1 flex-col gap-2.5">
              <h3 className="text-[1.75rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-[2rem]">{product.name}</h3>
              <p className={`mt-auto text-2xl font-semibold tracking-tight sm:text-[1.8rem] ${priceClassName}`}>
                {product.pricing.display}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              <h3 className="line-clamp-2 text-[1.2rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-[1.3rem]">
                {product.name}
              </h3>
              <p className="line-clamp-3 text-[13px] leading-5 text-slate-300/95">{product.detail}</p>
              <p
                className={`mt-auto inline-flex w-fit rounded-full border px-2.5 py-1 text-[1rem] font-semibold tracking-tight sm:text-[1.05rem] ${priceClassName}`}
              >
                {product.pricing.display}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Link
      href={detailHref}
      aria-label={`Ver detalle de ${product.name}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] shadow-[0_20px_48px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-[rgba(210,138,163,0.24)] hover:shadow-[0_30px_82px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.72)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {cardContent}
    </Link>
  );
}
