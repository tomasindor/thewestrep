import { CatalogHeader } from "@/components/catalog/catalog-header";
import { ProductBreadcrumb } from "@/components/catalog/product-breadcrumb";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductWhatsappCta } from "@/components/catalog/product-whatsapp-cta";
import { Container } from "@/components/ui/container";
import { SmartImage } from "@/components/ui/smart-image";
import { getRelatedCatalogProducts, type CatalogProduct } from "@/lib/catalog";

interface ProductDetailPageProps {
  product: CatalogProduct;
}

const pdpContent = {
  stock: {
    eyebrow: "Stock inmediato",
    supportHeading: "Reservá con precio, talle y entrega claros",
    supportDescription:
      "Ves la ficha completa, elegís talle y avanzás con carrito o por WhatsApp sin perder contexto comercial.",
    timingLabel: "Entrega estimada",
    fallbackTiming: "24/48 hs",
  },
  encargue: {
    eyebrow: "Encargue internacional",
    supportHeading: "Cotizá con plazo y referencia visibles desde la ficha",
    supportDescription:
      "Encontrás la referencia, el plazo estimado y la modalidad antes de pasar a la instancia de confirmación.",
    timingLabel: "Arribo estimado",
    fallbackTiming: "40-60 días",
  },
} as const;

const purchaseGuides = {
  stock: {
    title: "Cómo funciona el stock",
    description:
      "Ves el producto final, confirmás el talle publicado y cerrás la reserva desde la misma ficha sin pasos duplicados.",
    timing: "24/48 hs",
    steps: [
      "Elegís un talle disponible y validás el precio final antes de avanzar.",
      "Reservás por carrito o por WhatsApp sin volver a explicar qué producto querés.",
      "Coordinamos entrega o retiro con disponibilidad local una vez confirmada la reserva.",
    ],
  },
  encargue: {
    title: "Cómo funciona el encargue",
    description:
      "Usás la ficha como referencia comercial, confirmamos variante y talla, y recién ahí se cierra el pedido con seguimiento claro.",
    timing: "40-60 días",
    steps: [
      "Tomamos la referencia exacta del producto que ves publicado para evitar confusiones.",
      "Confirmamos talle, color o variante antes de avanzar con el pedido.",
      "Hacemos seguimiento del encargue con una ventana estimada de arribo de 40-60 días.",
    ],
  },
} as const;

export async function ProductDetailPage({ product }: ProductDetailPageProps) {
  const relatedProducts = await getRelatedCatalogProducts(product, 3);
  const content = pdpContent[product.availability];
  const selectedGuide = purchaseGuides[product.availability];
  const estimatedTiming = product.availabilityInfo.leadTime
    ? `${content.timingLabel} de ${product.availabilityInfo.leadTime}`
    : product.availability === "stock"
      ? product.availabilityInfo.summary
      : `${content.timingLabel} de ${content.fallbackTiming}`;

  return (
    <main className="flex-1">
      <div className="relative isolate">
        <CatalogHeader whatsappMessage="Hola, quiero ver el catálogo de thewestrep." />

        <section className="py-12 sm:py-18">
          <Container className="space-y-10">
            <div className="space-y-4">
              <ProductBreadcrumb availability={product.availability} productName={product.name} />
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium tracking-[0.28em] text-white/72 uppercase">
                <span className="rounded-full border border-orange-300/25 bg-orange-500/12 px-4 py-2 text-orange-100">
                  {content.eyebrow}
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                  {product.brand.name}
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                  {product.category.name}
                </span>
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] xl:items-stretch">
              <article className="flex h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                <div className="relative min-h-[24rem] flex-1 bg-black/20 sm:min-h-[32rem]">
                  <SmartImage
                    src={product.image}
                    alt={product.alt}
                    fill
                    className="object-contain p-6 sm:p-8"
                    sizes="(max-width: 1280px) 100vw, 58vw"
                    priority
                  />
                </div>
              </article>

              <div className="flex h-full flex-col gap-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,22,30,0.96),rgba(8,10,15,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">Ficha comercial</p>
                    <h1 className="font-display text-4xl leading-[0.92] text-white sm:text-6xl">{product.name}</h1>
                    <p className="text-3xl font-semibold text-orange-100">{product.pricing.display}</p>
                  </div>

                  <div className="space-y-3">
                    <h2 className="font-display text-3xl leading-[0.95] text-white sm:text-4xl">{content.supportHeading}</h2>
                    <p className="text-sm leading-6 text-slate-300 sm:text-base">{content.supportDescription}</p>
                  </div>

                  <p className="text-sm leading-6 text-slate-300 sm:text-base">{product.detail}</p>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <dt className="text-xs tracking-[0.24em] text-white/55 uppercase">Modalidad</dt>
                    <dd className="mt-2 text-base font-semibold text-white">{content.eyebrow}</dd>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <dt className="text-xs tracking-[0.24em] text-white/55 uppercase">Tiempo estimado</dt>
                    <dd className="mt-2 text-base font-semibold text-white">{estimatedTiming}</dd>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <dt className="text-xs tracking-[0.24em] text-white/55 uppercase">Seguimiento</dt>
                    <dd className="mt-2 text-sm leading-6 text-slate-300">{product.availabilityInfo.summary}</dd>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <dt className="text-xs tracking-[0.24em] text-white/55 uppercase">Selección disponible</dt>
                    <dd className="mt-2 text-sm leading-6 text-slate-300">
                      {product.sizes?.length
                        ? `${product.sizes.length} ${product.sizes.length === 1 ? "talle disponible" : "talles disponibles"}`
                        : "Consultá variantes disponibles"}
                    </dd>
                  </div>
                </dl>

                <ProductWhatsappCta product={product} />

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
                  <p className="font-medium text-white">{product.note}</p>
                  {product.availabilityInfo.stockNote ? <p className="mt-2">{product.availabilityInfo.stockNote}</p> : null}
                </div>
              </div>
            </div>

            <section>
              <article className="rounded-[2rem] border border-orange-300/30 bg-orange-500/8 p-6 sm:p-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">Cómo funciona</p>
                    <h3 className="font-display text-3xl leading-none text-white sm:text-4xl">{selectedGuide.title}</h3>
                    <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{selectedGuide.description}</p>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white">
                    Tiempo estimado: {product.availability === "encargue" && product.availabilityInfo.leadTime
                      ? product.availabilityInfo.leadTime
                      : selectedGuide.timing}
                  </div>

                  <ol className="grid gap-3 lg:grid-cols-3">
                    {selectedGuide.steps.map((step, index) => (
                      <li key={step} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                        <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-300/35 bg-orange-500/10 text-sm font-semibold text-orange-100">
                          {index + 1}
                        </span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            </section>

            {relatedProducts.length > 0 ? (
              <section className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">Relacionados</p>
                  <h2 className="font-display text-4xl leading-none text-white sm:text-5xl">Seguí viendo en la misma línea</h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Productos del mismo universo para mantener la navegación comercial sin cortar el recorrido.
                  </p>
                </div>

                <ProductGrid products={relatedProducts} />
              </section>
            ) : null}
          </Container>
        </section>
      </div>
    </main>
  );
}
