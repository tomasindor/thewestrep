import Image from "next/image";
import Link from "next/link";

import { PublicFooter } from "@/components/layout/public-footer";
import { getPublicNavItems, PublicHeader } from "@/components/layout/public-header";
import { BrandsSlider } from "@/components/marketing/brands-slider";
import { Container } from "@/components/ui/container";
import { SmartImage } from "@/components/ui/smart-image";
import { ProductGrid } from "@/components/catalog/product-grid";
import {
  getHomepageCategories,
  getHomepageBrands,
  getHomepageFeaturedProducts,
} from "@/lib/catalog";
import { homepageFaqItems } from "@/lib/faq";
import { siteConfig } from "@/lib/site";
import {
  compactGhostCtaClassName,
  ghostCtaClassName,
  solidCtaClassName,
} from "@/lib/ui";

const navItems = getPublicNavItems();

  const heroHighlights = [
    "sin trámites aduaneros para vos",
    "sin impuestos sorpresa al recibir",
    "proceso simple y coordinado",
  ];

const shoppingModes = [
    {
      title: "Stock inmediato",
      description: "Entrá a lo que ya está disponible y resolvé la compra rápido.",
      href: "/stock",
      cta: "Ver stock",
      eyebrow: "Compra directa",
      leadTime: "2-5 días",
    },
    {
      title: "Encargue internacional asistido",
      description:
        "Elegís el producto, nosotros hacemos la importación y luego lo despachamos localmente desde Argentina. Sin trámites aduaneros ni impuestos sorpresa para vos.",
      href: "/encargue",
      cta: "Ver encargues",
      eyebrow: "Sin trámites",
      leadTime: "30-60 días",
    },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl leading-[0.95] text-white sm:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}

function WhatsAppButton({
  label,
  className,
  message,
}: {
  label: string;
  className?: string;
  message: string;
}) {
  const href = `${siteConfig.whatsappUrl}${encodeURIComponent(message)}`;

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label}
    </a>
  );
}

export async function HomePage() {
  const [categoryCards, brandWall, featuredStockProducts] =
    await Promise.all([
      getHomepageCategories("encargue"),
      getHomepageBrands(),
      getHomepageFeaturedProducts("stock"),
    ]);

  return (
    <div className="relative isolate">
      <PublicHeader
        homeLinkHref="#top"
        homeLinkLabel="Ir al inicio"
        navItems={navItems}
        actions={(
          <Link href="/catalogo" className={compactGhostCtaClassName}>
            Ver catálogo
          </Link>
        )}
      />

      <section id="top" className="relative">
        <Container className="grid gap-10 py-12 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-12 lg:py-24">
          <div className="space-y-7 sm:space-y-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-[rgba(210,138,163,0.56)] bg-[rgba(210,138,163,0.12)] px-4 py-1 text-[11px] font-medium tracking-[0.32em] text-[#f4d7e0] uppercase">
                  streetwear importado
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-display text-sm tracking-[0.45em] text-[#f4d7e0] uppercase">
                  thewestrep
                </p>
                <h1 className="font-display max-w-4xl text-5xl leading-[0.9] text-white sm:text-7xl lg:text-[6rem]">
                  STREETWEAR LISTO PARA COMPRAR O ENCARGAR.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-7">
                  Stock inmediato para resolver rápido o encargue internacional asistido. Nosotros hacemos la importación y luego despachamos localmente, sin trámites para vos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] font-medium tracking-[0.28em] text-white/70 uppercase">
              {heroHighlights.map((item) => (
                <span key={item} className="rounded-full border border-white/10 px-4 py-2">
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/stock" className={solidCtaClassName}>
                Ver stock
              </Link>
              <Link href="/encargue" className={ghostCtaClassName}>
                Ver encargues
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="group relative min-h-[32rem] overflow-hidden rounded-[2rem] border border-white/10 bg-black">
              <Image
                src="/destacada.png"
                alt="Selección de productos de thewestrep"
                fill
                className="object-cover object-center transition duration-700 group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 36vw"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.34)_38%,rgba(0,0,0,0.84))]" />
              <div className="absolute inset-x-0 bottom-0 space-y-4 p-6 sm:p-8">
                <div className="max-w-sm rounded-[1.5rem] border border-white/12 bg-black/40 p-5 backdrop-blur-sm">
                  <p className="text-xs tracking-[0.34em] text-[#f1d2dc]/80 uppercase">
                    Cómo comprar
                  </p>
                  <p className="mt-3 text-3xl font-semibold leading-none text-white sm:text-4xl">
                    STOCK PARA RESOLVER YA. ENCARGUES ASISTIDOS HASTA TU DOMICILIO.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </Container>
      </section>

      <section id="modalidades" className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeading
            eyebrow="Modalidades"
            title="Elegí cómo querés comprar"
            description="Dos caminos claros según lo que necesitás. En encargues, elegís el producto y avanzás con nuestro servicio internacional asistido donde nosotros hacemos la importación y despachamos localmente."
          />

          <div className="grid gap-4 md:grid-cols-2">
            {shoppingModes.map((mode, index) => (
              <Link
                key={mode.title}
                href={mode.href}
                className={
                  index === 0
                    ? "group relative overflow-hidden rounded-[2rem] border border-[rgba(210,138,163,0.35)] bg-[radial-gradient(circle_at_top,rgba(210,138,163,0.22),rgba(7,8,12,0.98)_58%)] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1"
                    : "group relative overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(24,26,36,0.98),rgba(6,7,11,0.98))] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(210,138,163,0.56)]"
                }
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))] opacity-80" />
                <div className="relative flex h-full flex-col justify-between gap-10">
                  <div className="space-y-4">
                    <p className="text-xs tracking-[0.32em] text-[#f1d2dc]/80 uppercase">{mode.eyebrow}</p>
                    <div className="space-y-3">
                      <h3 className="text-4xl font-semibold leading-none text-white sm:text-5xl">{mode.title}</h3>
                      <p className="max-w-sm text-sm leading-6 text-slate-200 sm:text-base">{mode.description}</p>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] tracking-[0.24em] text-[#f1d2dc]/85 uppercase">
                        <span>Entrega estimada</span>
                        <span className="text-white">{mode.leadTime}</span>
                      </div>
                    </div>
                  </div>

                  <span className={solidCtaClassName}>{mode.cta}</span>
                </div>
              </Link>
            ))}
          </div>

        </Container>
      </section>

      <section id="marcas" className="py-8">
        <Container className="space-y-6">
          <SectionHeading
            eyebrow="Marcas"
            title="Entrá por marca"
            description="Una entrada más directa al catálogo: elegís la marca y ya caés con el filtro aplicado."
          />

          <BrandsSlider brands={brandWall} />
        </Container>
      </section>

      <section id="categorias" className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeading
            eyebrow="Categorías"
            title="Encargues por categoría"
            description="Entradas directas al catálogo de encargues asistidos con productos publicados y filtro aplicado desde el arranque."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categoryCards.length > 0 ? (
              categoryCards.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-[rgba(210,138,163,0.42)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden border-b border-white/10">
                    <SmartImage
                      src={item.image}
                      alt={item.alt}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 1280px) 50vw, 25vw"
                    />
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-2 text-[11px] font-medium tracking-[0.24em] uppercase">
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-white/75">
                        {item.availabilityLabel}
                      </span>
                      <span className="rounded-full border border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.12)] px-3 py-1 text-[#f1d2dc]/80">
                        {item.productCount} producto{item.productCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                    <p className="text-sm leading-6 text-slate-300">{item.description}</p>
                    <div className="flex items-center justify-between gap-3 pt-1 text-sm font-medium text-[#f4d7e0]">
                      <span>Ver categoría</span>
                      <span aria-hidden="true" className="text-lg transition duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="sm:col-span-2 xl:col-span-4">
                <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.03] p-6 sm:p-8">
                  <p className="text-xs font-medium tracking-[0.24em] text-[#f1d2dc]/75 uppercase">Catálogo en preparación</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Todavía no hay categorías con encargues publicados.</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Cuando publiquemos productos de encargue vas a poder entrar desde acá con el filtro aplicado.
                  </p>
                  <div className="mt-5">
                    <Link href="/encargue" className={ghostCtaClassName}>
                      Ir al catálogo de encargues
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section id="seleccion-inmediata" className="py-14 sm:py-18">
        <Container className="space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Stock"
              title="Selección inmediata"
              description="Una curaduría de piezas en stock para resolver la compra con entrega estimada de 2-5 días."
            />

            <Link href="/stock" className={ghostCtaClassName}>
              Ver todo el stock
            </Link>
          </div>

          {featuredStockProducts.length > 0 ? (
            <ProductGrid products={featuredStockProducts} cardVariant="home" contextAvailability="stock" />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-xs font-medium tracking-[0.24em] text-[#f1d2dc]/75 uppercase">Stock en pausa</p>
              <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">No hay productos de stock publicados ahora.</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                El storefront sigue operativo: podés entrar al catálogo para revisar novedades apenas se publiquen.
              </p>
              <div className="mt-5">
                <Link href="/stock" className={ghostCtaClassName}>
                  Abrir catálogo de stock
                </Link>
              </div>
            </div>
          )}
        </Container>
      </section>

      <section id="consultas" className="py-14 sm:py-18">
        <Container>
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-6 py-10 sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
              <div className="space-y-4">
                <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">
                  Consultas
                </p>
                <h2 className="font-display max-w-2xl text-5xl leading-[0.95] text-white sm:text-6xl">
                  Preguntas frecuentes
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Acá tenés lo básico. Si querés ver el detalle completo, entrá a preguntas frecuentes.
                </p>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-black/25 p-6 text-sm leading-6 text-slate-200">
                {homepageFaqItems.map((item) => (
                  <div key={item.question} className="space-y-1 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                    <h3 className="text-base font-semibold text-white">{item.question}</h3>
                    <p>{item.answer}</p>
                  </div>
                ))}
                <Link href="/consultas" className={ghostCtaClassName}>
                  Ver preguntas frecuentes
                </Link>
                <WhatsAppButton
                  label="Hacer una consulta personalizada"
                  message="Hola, tengo una consulta en thewestrep."
                  className={solidCtaClassName}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <PublicFooter />
    </div>
  );
}
