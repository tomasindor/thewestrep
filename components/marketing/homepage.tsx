import Link from "next/link";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "#marcas", label: "Marcas" },
  { href: "#modalidades", label: "Modalidades" },
  { href: "#destacados", label: "Destacados" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

const trustHighlights = [
  "Atención directa por WhatsApp",
  "Selección curada y drops limitados",
  "Stock inmediato + encargues internacionales",
  "Seguimiento simple, claro y sin vueltas",
];

const featuredBrands = [
  {
    name: "Nike & Jordan",
    label: "Streetwear + sneakers",
    description:
      "Rotación constante de pares, básicos premium y piezas que levantan cualquier fit.",
  },
  {
    name: "Carhartt WIP",
    label: "Workwear curado",
    description:
      "Texturas pesadas, siluetas limpias y prendas con presencia para stock o pedido.",
  },
  {
    name: "New Era",
    label: "Accesorio clave",
    description:
      "Gorras, caps y detalles editoriales para completar el look sin caer en lo obvio.",
  },
];

const featuredProducts = [
  {
    title: "Buzo heavyweight",
    mode: "Stock inmediato",
    price: "Desde USD 65",
    detail: "Listo para coordinar entrega en el momento.",
  },
  {
    title: "Sneakers edición buscada",
    mode: "Encargue internacional",
    price: "A pedido",
    detail: "Cotización directa según talle, color y disponibilidad.",
  },
  {
    title: "Cap premium",
    mode: "Stock rotativo",
    price: "Desde USD 32",
    detail: "Ideal para sumar ticket sin fricción y con salida rápida.",
  },
];

const steps = [
  {
    number: "01",
    title: "Elegís modalidad",
    description:
      "Entrás por stock inmediato si querés resolver rápido, o por encargue si buscás algo puntual.",
  },
  {
    number: "02",
    title: "Hablamos por WhatsApp",
    description:
      "Te pasamos opciones, precio y tiempos reales. Sin checkout frío, con atención humana.",
  },
  {
    number: "03",
    title: "Coordinamos entrega",
    description:
      "Confirmás, avanzamos y seguís el proceso con claridad hasta que llegue tu pedido.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
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
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {label}
    </a>
  );
}

export function HomePage() {
  return (
    <div className="premium-grid relative isolate">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top,_rgba(255,120,68,0.22),_transparent_38%)]" />
      <div className="pointer-events-none absolute left-1/2 top-72 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <Container className="flex items-center justify-between gap-6 py-4">
          <Link href="#top" className="flex items-center gap-3">
            <span className="heatmap-ring flex size-10 items-center justify-center rounded-2xl bg-white/5 text-sm font-semibold text-white">
              WR
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-white uppercase">
                {siteConfig.name}
              </p>
              <p className="text-xs text-slate-400">premium import selection</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <WhatsAppButton
            label="Hablar por WhatsApp"
            message="Hola, quiero conocer los ingresos y encargues de thewestrep."
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-orange-300/40 hover:bg-white/12"
          />
        </Container>
      </header>

      <section id="top" className="relative border-b border-white/10">
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-28">
          <div className="space-y-8">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-1 text-xs font-medium tracking-[0.32em] text-orange-100 uppercase">
                stock inmediato + encargue internacional
              </span>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                Curamos piezas con <span className="text-gradient">presencia real</span> para gente que no compra cualquier cosa.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                {siteConfig.name} mezcla velocidad y acceso: drops en stock para resolver ya, y encargues internacionales para traer eso que no aparece fácil acá.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <WhatsAppButton
                label="Ver stock inmediato"
                message="Hola, quiero ver el stock inmediato disponible en thewestrep."
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-50"
              />
              <WhatsAppButton
                label="Quiero hacer un encargue"
                message="Hola, quiero cotizar un encargue internacional con thewestrep."
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/6 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-orange-300/40 hover:bg-white/10"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustHighlights.map((item) => (
                <div
                  key={item}
                  className="glass-panel rounded-2xl px-4 py-4 text-sm leading-6 text-slate-200 transition hover:-translate-y-1"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel heatmap-ring relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-orange-500/18 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <p className="text-xs tracking-[0.26em] text-orange-100/80 uppercase">
                    Curaduría activa
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Moda importada con criterio
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  respuesta ágil
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs tracking-[0.26em] text-slate-400 uppercase">
                    Stock inmediato
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Productos listos para cerrar por WhatsApp y coordinar entrega sin fricción.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs tracking-[0.26em] text-slate-400 uppercase">
                    Encargues
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Búsqueda puntual, cotización clara y tiempos reales según cada pieza.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs tracking-[0.26em] text-slate-400 uppercase">
                  Señal de marca
                </p>
                <p className="mt-3 text-base leading-7 text-slate-100">
                  El lenguaje visual toma el heatmap del logo y lo vuelve atmósfera: energía controlada, premium y sin caer en ruido visual.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="marcas" className="border-b border-white/10 py-20">
        <Container className="space-y-10">
          <SectionHeading
            eyebrow="Marcas destacadas"
            title="Selección editorial para una vidriera que se siente curada"
            description="No se trata de cargar logos porque sí. La idea es mostrar categorías y universos de producto que hablan el idioma de thewestrep."
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {featuredBrands.map((brand, index) => (
              <article
                key={brand.name}
                className="glass-panel group rounded-[2rem] p-6 transition duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium tracking-[0.22em] text-slate-500 uppercase">
                    0{index + 1}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {brand.label}
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-semibold text-white transition group-hover:text-orange-100">
                  {brand.name}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {brand.description}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="modalidades" className="border-b border-white/10 py-20">
        <Container className="space-y-10">
          <SectionHeading
            eyebrow="Dos modalidades"
            title="Una home clara para vender rápido o captar pedidos de más valor"
            description="La experiencia explica enseguida cómo trabaja la marca, así cada visitante entiende por dónde entrar según su necesidad."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="glass-panel heatmap-ring rounded-[2rem] p-8">
              <p className="text-xs tracking-[0.3em] text-orange-200/80 uppercase">
                Stock inmediato
              </p>
              <h3 className="mt-4 text-3xl font-semibold text-white">
                Para el que quiere resolver hoy.
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Ideal para drops disponibles, prendas listas para salir y contenido que empuja conversaciones rápidas por WhatsApp.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li>• Productos visibles y listos para coordinar</li>
                <li>• Mensaje directo con poca fricción</li>
                <li>• Perfecto para historias, lanzamientos y rotación</li>
              </ul>
            </article>

            <article className="glass-panel rounded-[2rem] p-8">
              <p className="text-xs tracking-[0.3em] text-fuchsia-200/80 uppercase">
                Encargues internacionales
              </p>
              <h3 className="mt-4 text-3xl font-semibold text-white">
                Para encontrar lo que no está al alcance de cualquiera.
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Pensado para consultas de mayor ticket: búsqueda puntual, cotización a medida y una experiencia más boutique.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li>• Consulta asistida por WhatsApp</li>
                <li>• Precio y tiempos aterrizados desde el inicio</li>
                <li>• Mensaje premium, sin promesas vacías</li>
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section id="destacados" className="border-b border-white/10 py-20">
        <Container className="space-y-10">
          <SectionHeading
            eyebrow="Preview de productos"
            title="Tarjetas simples para empezar a mostrar oferta sin meter catálogo completo"
            description="Es un MVP, así que el foco está en el ritmo visual y en disparar conversaciones, no en resolver e-commerce todavía."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product) => (
              <article
                key={product.title}
                className="glass-panel rounded-[2rem] p-6 transition duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {product.mode}
                  </span>
                  <span className="text-sm font-medium text-orange-100">
                    {product.price}
                  </span>
                </div>
                <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,120,68,0.24),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.02))] p-5">
                  <p className="text-xs tracking-[0.26em] text-slate-400 uppercase">
                    Producto curado
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {product.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    {product.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="como-funciona" className="border-b border-white/10 py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Cómo funciona"
            title="Una experiencia simple que convierte sin sobrecargar el MVP"
            description="El sitio presenta, ordena y genera confianza. La conversión fuerte pasa por WhatsApp, donde la marca puede cerrar mejor y mantener el tono boutique."
          />

          <div className="space-y-4">
            {steps.map((step) => (
              <article
                key={step.number}
                className="glass-panel rounded-[1.75rem] p-6"
              >
                <div className="flex gap-4">
                  <span className="text-sm font-semibold tracking-[0.24em] text-orange-100/80">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-white/10 py-20">
        <Container>
          <div className="glass-panel rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">
                  Sobre la marca
                </p>
                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  thewestrep no busca ser una tienda más: busca sentirse selecta, rápida y confiable.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  El tono visual y de contenido apunta a eso: una marca que sabe lo que vende, que habla claro y que usa cada interacción para construir confianza antes de sumar complejidad operativa.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-200">
                <p>
                  Este homepage deja una base sólida para la próxima etapa: catálogo real, fichas de producto, automatizaciones de consulta y una navegación más profunda cuando el negocio lo pida.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <footer className="py-10">
        <Container className="flex flex-col gap-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold tracking-[0.24em] text-white uppercase">
              {siteConfig.name}
            </p>
            <p className="mt-2">Stock inmediato, encargues internacionales y atención humana.</p>
          </div>

          <div className="flex flex-wrap gap-5">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
            <WhatsAppButton
              label="WhatsApp"
              message="Hola, quiero recibir novedades de thewestrep."
              className="transition hover:text-white"
            />
          </div>
        </Container>
      </footer>
    </div>
  );
}
