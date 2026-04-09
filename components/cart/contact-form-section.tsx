"use client";

import Link from "next/link";

import type { CartCustomerProfile } from "@/lib/cart/types";
import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";
import { inputClassName, surfaceClassName } from "@/lib/ui";

const accentEyebrowClassName = "text-[#f1d2dc]/72";
const accentBadgeClassName = "border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.12)] text-[#f4d7e0]";
const accentSurfaceClassName = "border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.08)]";

interface ContactFormSectionProps {
  customer: CartCustomerProfile;
  updateCustomer: (field: keyof CartCustomerProfile, value: string) => void;
  hasTriedSubmit: boolean;
  customerProfile: CustomerProfileSnapshot | null;
}

export function ContactFormSection({
  customer,
  updateCustomer,
  hasTriedSubmit,
  customerProfile,
}: ContactFormSectionProps) {
  return (
    <section className={surfaceClassName}>
      <div className="flex items-start gap-4">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${accentBadgeClassName}`}>1</span>
        <div className="space-y-2">
          <p className={`text-xs font-medium tracking-[0.28em] uppercase ${accentEyebrowClassName}`}>Comprador</p>
          <h2 className="text-2xl font-semibold text-white">Quién recibe la confirmación</h2>
          <p className="text-sm leading-6 text-slate-300">
            Dejanos los datos principales para confirmar tu pedido y seguir la coordinación.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Nombre y apellido *</span>
          <input
            value={customer.name}
            onChange={(event) => updateCustomer("name", event.target.value)}
            placeholder="Ej: Gonzalo Pérez"
            className={`${inputClassName} ${hasTriedSubmit && !customer.name.trim() ? "border-red-300/60" : ""}`}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Teléfono *</span>
          <input
            value={customer.phone}
            onChange={(event) => updateCustomer("phone", event.target.value)}
            placeholder="Ej: +54 9 11 5555 5555"
            className={`${inputClassName} ${hasTriedSubmit && !customer.phone.trim() ? "border-red-300/60" : ""}`}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Email *</span>
          <input
            type="email"
            value={customer.email}
            onChange={(event) => updateCustomer("email", event.target.value)}
            placeholder="Ej: nombre@correo.com"
            className={`${inputClassName} ${hasTriedSubmit && !customer.email.trim() ? "border-red-300/60" : ""}`}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">CUIL</span>
          <input
            value={customer.cuil}
            onChange={(event) => updateCustomer("cuil", event.target.value)}
            placeholder="Ej: 20-12345678-3"
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Canal preferido</span>
          <select
            value={customer.preferredChannel}
            onChange={(event) => updateCustomer("preferredChannel", event.target.value)}
            className={inputClassName}
          >
            <option value="">Elegir canal</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="email">Mail</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Tipo de compra</span>
          <select
            value={customer.customerStatus}
            onChange={(event) => updateCustomer("customerStatus", event.target.value)}
            className={inputClassName}
          >
            <option value="">Seleccionar</option>
            <option value="new">Es mi primera compra</option>
            <option value="returning">Ya compré antes</option>
          </select>
        </label>
      </div>

      <div className={`mt-6 rounded-[1.4rem] border p-4 text-sm leading-6 text-slate-200 ${accentSurfaceClassName}`}>
        <p className="font-semibold text-white">Tus datos</p>
        <p className="mt-2">
          Usamos esta información para confirmar el pedido y seguir la coordinación por el canal que prefieras.
        </p>
        {customerProfile ? (
          <p className="mt-2 text-slate-300">
            Si actualizás el perfil en{" "}
            <Link href="/profile" className="text-white underline decoration-white/20 underline-offset-4">
              /profile
            </Link>
            , este checkout reutiliza esos datos cuando faltan en el dispositivo.
          </p>
        ) : null}
      </div>
    </section>
  );
}
