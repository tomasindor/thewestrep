import Link from "next/link";

import { ComboRail } from "@/components/catalog/combo-rail";
import { ProductBreadcrumb } from "@/components/catalog/product-breadcrumb";
import { ProductImageGallery } from "@/components/catalog/product-image-gallery";
import { RelatedProductsCarousel } from "@/components/catalog/related-products-carousel";
import { ProductWhatsappCta } from "@/components/catalog/product-whatsapp-cta";
import { Container } from "@/components/ui/container";
import { getCatalogFilterHref, getRelatedCatalogProducts, type CatalogProduct } from "@/lib/catalog";
import { sanitizeJsonLd } from "@/lib/seo";
import { getAbsoluteUrl } from "@/lib/site";

interface ProductDetailPageProps {
  product: CatalogProduct;
}

const LEGACY_ENCARGUE_NOTE = "Pedilo por encargue y te pasamos precio final por WhatsApp.";

function normalizeOptionLabel(label: string) {
  return label.trim().toLowerCase();
}

function getVisibleVariantLabels(product: CatalogProduct) {
  const sizeLabels = new Set((product.sizes ?? []).map((size) => normalizeOptionLabel(size.label)));
  const uniqueVariants = new Map<string, string>();

  for (const variant of product.variants ?? []) {
    const normalizedVariant = normalizeOptionLabel(variant.label);

    if (!normalizedVariant || sizeLabels.has(normalizedVariant) || uniqueVariants.has(normalizedVariant)) {
      continue;
    }

    uniqueVariants.set(normalizedVariant, variant.label.trim());
  }

  return Array.from(uniqueVariants.values());
}

const shippingProcessContent = {
  stock: {
    title: "Compra resuelta, despacho bien coordinado.",
    description:
      "Cuando la pieza está en stock, el proceso es más directo: confirmás talle o variante, cerrás la compra y coordinamos el envío o retiro sin vueltas ni pasos artificiales.",
    note: "La coordinación se hace según destino y disponibilidad real para que sepas cuándo sale el pedido y cómo sigue la entrega.",
    steps: [
      {
        title: "Selección final",
        description:
          "Confirmás la variante y el talle exacto antes de sumar la pieza para que el pedido quede cerrado sin margen de duda.",
      },
      {
        title: "Cierre inmediato",
        description:
          "Como ya está disponible, avanzás directo con la compra y dejamos asentados los datos necesarios para la entrega.",
      },
      {
        title: "Envío o retiro",
        description:
          "Despachamos o coordinamos retiro con confirmación real, priorizando claridad sobre tiempos y seguimiento.",
      },
    ],
  },
  encargue: {
    title: "Encargue internacional asistido puerta a puerta.",
    description:
      "Encargamos a nuestros proveedores y te acompañamos durante todo el proceso hasta la entrega en tu domicilio, con confirmaciones y tiempos estimados antes de avanzar.",
    note: "Mantenemos comunicación directa durante todo el recorrido para que tengas referencia del estado del pedido hasta el cierre final.",
    steps: [
      {
        title: "Definición del pedido",
        description:
          "Definimos variante, talle y disponibilidad final antes de avanzar para que el pedido quede cerrado con precisión.",
      },
      {
        title: "Gestión con proveedores",
        description:
          "Encargamos la pieza con nuestros proveedores y te compartimos tiempos estimados, estado del proceso y novedades relevantes.",
      },
      {
        title: "Entrega coordinada",
        description:
          "Cuando el pedido está listo, coordinamos el tramo final con confirmación previa y seguimiento hasta la entrega en tu domicilio.",
      },
    ],
  },
} as const;

export async function ProductDetailPage({ product }: ProductDetailPageProps) {
  const relatedProducts = await getRelatedCatalogProducts(product, 10);
  const visibleVariants = getVisibleVariantLabels(product);
  const brandHref = getCatalogFilterHref(product.availability, { brandId: product.brand.id });
  const categoryHref = getCatalogFilterHref(product.availability, { categoryId: product.category.id });
  const productNote = product.note?.trim();
  const shouldShowProductNote = Boolean(productNote) && productNote !== LEGACY_ENCARGUE_NOTE;
  const shippingProcess = shippingProcessContent[product.availability];
  const hasSupportingMeta =
    (product.availability !== "encargue" && Boolean(product.availabilityInfo.summary)) ||
    shouldShowProductNote ||
    (product.availability !== "encargue" && Boolean(product.availabilityInfo.stockNote)) ||
    (product.availability !== "encargue" && Boolean(product.availabilityInfo.leadTime));
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.detail,
    image: product.gallery.map((image) => getAbsoluteUrl(image.src)),
    brand: {
      "@type": "Brand",
      name: product.brand.name,
    },
    category: product.category.name,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: product.pricing.currency,
      price: product.pricing.amount,
      availability: product.availability === "stock" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
      url: getAbsoluteUrl(`/${product.availability}/${product.slug}`),
    },
  };

  return (
    <div className="relative isolate">
      <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: sanitizeJsonLd(productJsonLd),
          }}
        />

        <section className="py-5 sm:py-6 lg:py-8">
          <Container className="space-y-8 sm:space-y-10 lg:space-y-12">
            <div className="flex flex-col gap-2.5 px-1 sm:px-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <ProductBreadcrumb availability={product.availability} productName={product.name} />
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] font-medium tracking-[0.24em] text-[#f1d2dc]/72 uppercase sm:text-xs">
                <Link
                  href={brandHref}
                  className="rounded-full border border-transparent px-2.5 py-1 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-[#f6dbe4] focus-visible:border-white/10 focus-visible:bg-white/[0.05] focus-visible:text-[#f6dbe4] focus-visible:outline-none"
                >
                  {product.brand.name}
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  href={categoryHref}
                  className="rounded-full border border-transparent px-2.5 py-1 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-[#f6dbe4] focus-visible:border-white/10 focus-visible:bg-white/[0.05] focus-visible:text-[#f6dbe4] focus-visible:outline-none"
                >
                  {product.category.name}
                </Link>
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(24rem,0.84fr)] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1.12fr)_minmax(26rem,0.88fr)]">
              <article className="flex w-full min-w-0">
                <ProductImageGallery images={product.gallery} fallbackAlt={product.alt} />
              </article>

              <div className="xl:sticky xl:top-28">
                <div className="flex h-full flex-col justify-between gap-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,22,31,0.98),rgba(7,9,14,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.34)] ring-1 ring-white/6 sm:p-6">
                  <div className="space-y-4">
                    <div className="space-y-3.5">
                      <div className="space-y-2.5">
                        <h1 className="font-display text-[2.35rem] leading-[0.9] text-white sm:text-5xl lg:text-[3.4rem]">
                          {product.name}
                        </h1>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                          <p className="text-4xl font-semibold tracking-tight text-[#f7dfe6] drop-shadow-[0_12px_28px_rgba(210,138,163,0.14)] sm:text-[2.8rem]">
                            {product.pricing.display}
                          </p>
                        </div>
                        {product.availability !== "encargue" && product.availabilityInfo.summary ? (
                          <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">{product.availabilityInfo.summary}</p>
                        ) : null}
                        {shouldShowProductNote ? (
                          <p className="text-sm leading-6 text-slate-400">{productNote}</p>
                        ) : null}
                        {product.availability !== "stock" ? (
                          <p className="text-[11px] font-medium tracking-[0.2em] text-white/46 uppercase">
                            {product.availabilityLabel}
                          </p>
                        ) : null}
                        {product.availability !== "encargue" && product.availabilityInfo.stockNote ? (
                          <p className="text-sm leading-6 text-slate-400">{product.availabilityInfo.stockNote}</p>
                        ) : null}
                        {product.availability !== "encargue" && product.availabilityInfo.leadTime ? (
                          <p className="text-sm leading-6 text-slate-400">{product.availabilityInfo.leadTime}</p>
                        ) : null}
                        {hasSupportingMeta && product.availability !== "stock" ? (
                          <p className="text-[11px] font-medium tracking-[0.2em] text-white/46 uppercase">
                            {product.availability === "encargue" ? product.availabilityLabel : "Compra directa"}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <ProductWhatsappCta product={product} visibleVariants={visibleVariants} />
                </div>
              </div>
            </div>

            <section className="grid gap-4 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.012))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] ring-1 ring-white/6 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6">
              <div className="space-y-3 lg:col-span-2">
                <p className="max-w-4xl text-sm leading-6 text-slate-300 sm:text-base">{product.detail}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">Proceso de envío</p>
                <h2 className="font-display text-3xl leading-none text-white sm:text-[2.6rem]">{shippingProcess.title}</h2>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">{shippingProcess.description}</p>
                <p className="text-xs leading-5 text-slate-400 sm:text-sm">{shippingProcess.note}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {shippingProcess.steps.map((step, index) => (
                  <article key={step.title} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-medium tracking-[0.22em] text-[#efcad6]/68 uppercase">0{index + 1}</p>
                    <h3 className="mt-3 text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            {product.comboEligible && product.comboGroup ? (
              <ComboRail product={product} comboGroup={product.comboGroup} availability={product.availability} />
            ) : null}

            {relatedProducts.length > 0 ? (
              <section className="space-y-8 border-t border-white/8 pt-14 sm:space-y-9 sm:pt-18 lg:pt-24">
                <div className="space-y-3 px-1">
                  <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">Relacionados</p>
                  <h2 className="font-display text-4xl leading-none text-white sm:text-5xl">Seguí viendo piezas con más afinidad</h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Priorizamos marca y categoría para que la exploración siga una línea más precisa, sin ruido ni repeticiones.
                  </p>
                </div>

                <RelatedProductsCarousel products={relatedProducts} />
              </section>
            ) : null}
          </Container>
        </section>

    </div>
  );
}
