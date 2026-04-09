import Link from "next/link";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";
import { getWhatsAppHref } from "@/lib/site";
import { compactGhostCtaClassName, navLinkClassName } from "@/lib/ui";

const footerNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/stock", label: "Stock" },
  { href: "/encargue", label: "Encargues" },
  { href: "/consultas", label: "Consultas" },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <Container className="space-y-8 text-sm text-slate-400">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="space-y-3">
            <BrandLogo className="h-12 w-12" sizes="48px" />
            <p>Streetwear importado con stock inmediato y encargue internacional asistido.</p>
            <p className="text-slate-500">
              En el encargue internacional asistido, elegís el producto y te acompañamos durante todo el proceso hasta la entrega en tu domicilio.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.28em] text-white uppercase">Navegación</p>
            <div className="flex flex-col gap-2">
              {footerNavItems.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClassName}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.28em] text-white uppercase">Contacto</p>
            <div className="space-y-2">
              <p>Atención por WhatsApp para stock, pedidos, talles y consultas.</p>
              <a
                href={getWhatsAppHref("Hola, quiero hacer una consulta en thewestrep.")}
                target="_blank"
                rel="noreferrer"
                className={compactGhostCtaClassName}
              >
                Escribir ahora
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© thewestrep. Stock y pedidos importados.</p>
          <p>Proceso asistido, coordinación directa y seguimiento real por WhatsApp.</p>
        </div>
      </Container>
    </footer>
  );
}
