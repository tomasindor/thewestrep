import Link from "next/link";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";
import { getWhatsAppHref, siteConfig } from "@/lib/site";
import { compactGhostCtaClassName, navLinkClassName } from "@/lib/ui";

const footerNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/stock", label: "Stock" },
  { href: "/encargue", label: "Encargues" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/consultas", label: "Consultas frecuentes" },
] as const;

const whatsappContactHref = getWhatsAppHref("Hola, quiero hacer una consulta en thewestrep.");

const socialLinks = [
  {
    href: siteConfig.instagramUrl,
    label: "Instagram de thewestrep",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm8.7 2.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      </svg>
    ),
  },
  {
    href: siteConfig.facebookUrl,
    label: "Facebook de thewestrep",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M14 8.2V6.9c0-.62.42-.77.72-.77h1.82V3.12L14.03 3.1C11.25 3.1 10.62 5.18 10.62 6.5v1.7H8.36v3.38h2.26V21h3.38v-9.42h2.82l.37-3.38H14Z" />
      </svg>
    ),
  },
  {
    href: whatsappContactHref,
    label: "WhatsApp de thewestrep",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.92 9.92 0 0 0 4.76 1.21h.01A9.92 9.92 0 0 0 22 11.93 9.9 9.9 0 0 0 12.04 2Zm.01 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 1 1 7 3.87Zm4.5-6.13c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23a7.55 7.55 0 0 1-1.38-1.72c-.15-.25-.02-.38.1-.5.12-.11.25-.29.38-.43.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.17 1.78 2.72 4.3 3.81.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.3Z" />
      </svg>
    ),
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-white/8 bg-black text-sm text-slate-400">
      <Container className="space-y-8 py-10 sm:py-12">
        <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr_1fr] md:items-start">
          <div className="space-y-4">
            <Link href="/" aria-label="Ir al inicio de thewestrep" className="inline-flex rounded-full transition hover:opacity-90">
              <BrandLogo className="h-12 w-12" sizes="48px" />
            </Link>
            <div className="space-y-2">
              <p className="font-display text-2xl leading-none tracking-[0.12em] text-white uppercase">thewestrep</p>
              <p className="max-w-sm leading-6">
                Streetwear importado, stock inmediato y encargue internacional asistido.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.28em] text-white uppercase">Links útiles</p>
            <nav aria-label="Links útiles del footer" className="flex flex-col gap-2">
              {footerNavItems.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClassName}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-[0.28em] text-white uppercase">Contacto</p>
              <p className="max-w-sm leading-6">
                Catálogo claro, coordinación directa y seguimiento por WhatsApp.
              </p>
            </div>

            <a
              href={whatsappContactHref}
              target="_blank"
              rel="noreferrer"
              className={compactGhostCtaClassName}
            >
              Escribir ahora
            </a>

            <div className="flex items-center gap-3">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.05] text-white/90 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(210,138,163,0.56)] hover:bg-[rgba(210,138,163,0.14)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© thewestrep. Stock y pedidos importados.</p>
          <p>Precios claros, selección curada y atención directa.</p>
        </div>
      </Container>
    </footer>
  );
}
