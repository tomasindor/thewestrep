"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { buildAuthEntryHref } from "@/lib/auth/customer-auth-navigation";
import { ghostCtaClassName, solidCtaClassName } from "@/lib/ui";

const accentEyebrowClassName = "text-[#f1d2dc]/72";

export function CheckoutAccessGate() {
  const { updateCustomer } = useCart();

  const loginHref = buildAuthEntryHref("/login", "/checkout");
  const registerHref = buildAuthEntryHref("/register", "/checkout");

  const continueAsGuest = () => {
    updateCustomer("checkoutMode", "guest");
    updateCustomer("authProvider", "");
  };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <p className={`text-xs font-medium tracking-[0.28em] uppercase ${accentEyebrowClassName}`}>Acceso requerido</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Primero resolvé tu acceso</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        El checkout ya no muestra el bloque de login inline. Ahora este paso vive en una página dedicada para entrar con email, Google o invitado antes de seguir.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={loginHref} className={solidCtaClassName}>
          Iniciar sesión
        </Link>
        <Link href={registerHref} className={ghostCtaClassName}>
          Crear cuenta
        </Link>
        <button type="button" onClick={continueAsGuest} className={ghostCtaClassName}>
          Continuar como invitado
        </button>
        <Link href="/catalogo" className={ghostCtaClassName}>
          Volver al catálogo
        </Link>
      </div>
    </section>
  );
}
