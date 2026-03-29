import Image from "next/image";
import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";
import { Carousel } from "@/components/ui/carousel";
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
  navLinkClassName,
  solidCtaClassName,
} from "@/lib/ui";

const navItems = [
  { href: "#modalidades", label: "Modalidades" },
  { href: "#categorias", label: "Categorías" },
  { href: "#seleccion-inmediata", label: "Selección inmediata" },
  { href: "#consultas", label: "Consultas" },
];

const heroHighlights = [
  "impuestos incluidos",
  "sin trámites después del pago",
  "envío coordinado luego de la compra",
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
    title: "Encargue Internacional",
    description:
      "Primero encontrás el producto en el catálogo y después avanzás por WhatsApp con esa referencia.",
    href: "/encargue",
    cta: "Ver encargues",
    eyebrow: "Catálogo a pedido",
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
      <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">
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
        navItems={[
          { href: "#modalidades", label: "Modalidades" },
          { href: "#categorias", label: "Categorías" },
          { href: "#seleccion-inmediata", label: "Selección inmediata" },
          { href: "#consultas", label: "Consultas" },
        ]}
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
                <span className="inline-flex rounded-full border border-orange-300/35 bg-orange-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.32em] text-orange-100 uppercase">
                  streetwear importado
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-display text-sm tracking-[0.45em] text-orange-100/75 uppercase">
                  thewestrep
                </p>
                <h1 className="font-display max-w-4xl text-5xl leading-[0.9] text-white sm:text-7xl lg:text-[6rem]">
                  STREETWEAR LISTO PARA COMPRAR O ENCARGAR.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-7">
                  Entrá por stock o explorá encargues. Primero encontrás el producto en el catálogo y después seguís por WhatsApp con esa referencia.
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
                  <p className="text-xs tracking-[0.34em] text-orange-100/80 uppercase">
                    Cómo comprar
                  </p>
                  <p className="mt-3 text-3xl font-semibold leading-none text-white sm:text-4xl">
                    STOCK PARA VER YA. ENCARGUES PARA ELEGIR DESDE CATÁLOGO.
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
            description="Dos caminos simples para entrar según lo que necesitás. En encargues, primero encontrás el producto en el catálogo y después avanzás con esa referencia."
          />

          <div className="grid gap-4 md:grid-cols-2">
            {shoppingModes.map((mode, index) => (
              <Link
                key={mode.title}
                href={mode.href}
                className={
                  index === 0
                    ? "group relative overflow-hidden rounded-[2rem] border border-orange-300/25 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.22),rgba(7,8,12,0.98)_58%)] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1"
                    : "group relative overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(24,26,36,0.98),rgba(6,7,11,0.98))] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/35"
                }
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))] opacity-80" />
                <div className="relative flex h-full flex-col justify-between gap-10">
                  <div className="space-y-4">
                    <p className="text-xs tracking-[0.32em] text-orange-100/80 uppercase">{mode.eyebrow}</p>
                    <div className="space-y-3">
                      <h3 className="text-4xl font-semibold leading-none text-white sm:text-5xl">{mode.title}</h3>
                      <p className="max-w-sm text-sm leading-6 text-slate-200 sm:text-base">{mode.description}</p>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] tracking-[0.24em] text-orange-100/85 uppercase">
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
            title="Entrá a encargues por marca"
            description="Una entrada más directa al catálogo: elegís la marca y ya caés con el filtro aplicado."
          />

          <Carousel
            ariaLabel="Marcas destacadas para encargues"
            itemLabel="marcas"
            visibleItems={{ base: 1, sm: 2, lg: 3 }}
          >
            {brandWall.map((brand) => (
              <Link
                key={brand.id}
                href={brand.href}
                className="group relative isolate flex h-full min-h-[19rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5 transition duration-300 hover:-translate-y-1 hover:border-orange-300/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),rgba(15,23,42,0)_44%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] opacity-90 transition duration-500 group-hover:opacity-100" />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,12,0.1),rgba(7,8,12,0.24)_55%,rgba(7,8,12,0.6))]" />

                <div className="relative flex h-full flex-col gap-5">
                  <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.07] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    {brand.image ? (
                      <SmartImage
                        src={brand.image ?? ""}
                        alt={brand.alt}
                        fill
                        className="object-contain p-6 transition duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 30vw"
                      />
                    ) : (
                      <span className="text-center font-display text-2xl tracking-[0.16em] text-white uppercase">
                        {brand.name}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
                  </div>

                  <div className="mt-auto space-y-3 rounded-[1.35rem] border border-white/8 bg-black/10 p-4 backdrop-blur-[1px]">
                    <p className="font-display text-2xl tracking-[0.14em] text-white uppercase sm:text-[1.7rem]">
                      {brand.name}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-slate-300 transition duration-300 group-hover:text-orange-100">
                      <span>Ver productos</span>
                      <span aria-hidden="true" className="text-base transition duration-300 group-hover:translate-x-1">
                        ↗
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </Carousel>
        </Container>
      </section>

      <section id="categorias" className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeading
            eyebrow="Categorías"
            title="Encargues por categoría"
            description="Entradas directas al catálogo de encargues con productos publicados y filtro aplicado desde el arranque."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categoryCards.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-orange-300/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
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
                    <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-orange-100/80">
                      {item.productCount} producto{item.productCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                  <p className="text-sm leading-6 text-slate-300">{item.description}</p>
                  <div className="flex items-center justify-between gap-3 pt-1 text-sm font-medium text-orange-100">
                    <span>Ver categoría</span>
                    <span aria-hidden="true" className="text-lg transition duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
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

          <ProductGrid products={featuredStockProducts} cardVariant="home" />
        </Container>
      </section>

      <section id="consultas" className="py-14 sm:py-18">
        <Container>
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-6 py-10 sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
              <div className="space-y-4">
                <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">
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
                  label="Hacer una consulta"
                  message="Hola, tengo una consulta sobre stock o encargues en thewestrep."
                  className={solidCtaClassName}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-white/10 py-10">
        <Container className="space-y-8 text-sm text-slate-400">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="space-y-3">
              <BrandLogo className="h-12 w-12" sizes="48px" />
              <p>Streetwear importado con stock inmediato y encargues internacionales.</p>
              <p className="text-slate-500">
                Comprás por stock o elegís el producto en encargues y seguís por WhatsApp con esa referencia.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium tracking-[0.28em] text-white uppercase">Navegación</p>
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className={navLinkClassName}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium tracking-[0.28em] text-white uppercase">Contacto</p>
              <div className="space-y-2">
                <p>Atención por WhatsApp para stock, pedidos y consultas.</p>
                <WhatsAppButton
                  label="Escribir ahora"
                  message="Hola, quiero hacer una consulta en thewestrep."
                  className={compactGhostCtaClassName}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© thewestrep. Stock y pedidos importados.</p>
            <p>Precios claros, coordinación directa y seguimiento por WhatsApp.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
