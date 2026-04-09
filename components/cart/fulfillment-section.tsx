"use client";

import type { CartCustomerProfile } from "@/lib/cart/types";
import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";
import { fulfillmentOptions, getFulfillmentCopy, getLocationLabel } from "@/lib/orders/checkout.shared";
import { formatArs } from "@/lib/utils";
import { inputClassName, surfaceClassName } from "@/lib/ui";
import { CORREO_ARGENTINO_FEE } from "@/lib/cart/assisted-orders";

const accentEyebrowClassName = "text-[#f1d2dc]/72";
const accentTextClassName = "text-[#f4d7e0]";
const accentBadgeClassName = "border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.12)] text-[#f4d7e0]";
const accentSurfaceClassName = "border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.08)]";

interface FulfillmentSectionProps {
  customer: CartCustomerProfile;
  updateCustomer: (field: keyof CartCustomerProfile, value: string) => void;
  hasTriedSubmit: boolean;
  hasEncargueOrder: boolean;
  correoArgentinoFeeTotal: number;
  savedShippingSummary: string;
  customerProfile: CustomerProfileSnapshot | null;
}

export function FulfillmentSection({
  customer,
  updateCustomer,
  hasTriedSubmit,
  hasEncargueOrder,
  correoArgentinoFeeTotal,
  savedShippingSummary,
  customerProfile,
}: FulfillmentSectionProps) {
  const requiredLocation = customer.location.trim();

  return (
    <section className={surfaceClassName}>
      <div className="flex items-start gap-4">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${accentBadgeClassName}`}>2</span>
        <div className="space-y-2">
          <p className={`text-xs font-medium tracking-[0.28em] uppercase ${accentEyebrowClassName}`}>Entrega</p>
          <h2 className="text-2xl font-semibold text-white">Cómo coordinamos la entrega</h2>
          <p className="text-sm leading-6 text-slate-300">
            Elegí la modalidad que mejor te quede y dejá una referencia clara para coordinar la entrega.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {fulfillmentOptions.map((option) => {
          const isSelected = customer.fulfillment === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateCustomer("fulfillment", option.value)}
              className={`rounded-[1.4rem] border p-4 text-left transition ${
                isSelected
                  ? accentSurfaceClassName
                  : "border-white/10 bg-black/20 hover:border-[rgba(210,138,163,0.3)]"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{option.description}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white">
                  + {formatArs(option.fee)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Destinatario</span>
          <input
            value={customer.deliveryRecipient}
            onChange={(event) => updateCustomer("deliveryRecipient", event.target.value)}
            placeholder="Ej: Gonzalo Pérez"
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">{getLocationLabel(customer.fulfillment)} *</span>
          <input
            value={customer.location}
            onChange={(event) => updateCustomer("location", event.target.value)}
            placeholder="Ej: Palermo, CABA / Rosario, Santa Fe / Calle y altura"
            className={`${inputClassName} ${hasTriedSubmit && !requiredLocation ? "border-red-300/60" : ""}`}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Notas del pedido</span>
          <textarea
            value={customer.notes}
            onChange={(event) => updateCustomer("notes", event.target.value)}
            placeholder="Ej: horario sugerido, referencia del edificio, detalle a coordinar"
            rows={4}
            className={`${inputClassName} resize-y`}
          />
        </label>
      </div>

      {hasEncargueOrder ? (
        <div className={`mt-6 rounded-[1.4rem] border p-4 text-sm leading-6 text-slate-200 ${accentSurfaceClassName}`}>
          <p className="font-semibold text-white">Encargue internacional asistido puerta a puerta</p>
          <p className="mt-2">
            Tu pedido incluye seguimiento asistido hasta la entrega en domicilio.
          </p>
          <p className={`mt-2 ${accentTextClassName}`}>
            Correo Argentino agrega un cargo fijo único de {formatArs(CORREO_ARGENTINO_FEE)} por pedido asistido, sin importar la cantidad de productos.
          </p>
          <p className="mt-2 text-slate-300">
            Los tiempos son estimados y pueden variar según operador, aduana y correo local. En casos excepcionales puede requerirse validar datos del destinatario final.
          </p>
        </div>
      ) : null}

      <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
        <p className="font-semibold text-white">Antes de confirmar</p>
        <ul className="mt-3 space-y-2">
          <li>• La modalidad ya impacta el total estimado.</li>
          <li>• Podés dejar destinatario, CUIL y referencias para evitar retrabajo después.</li>
          <li>• La ubicación nos sirve como referencia para coordinar la entrega.</li>
          <li>• Las notas te permiten sumar cualquier detalle útil para el pedido.</li>
        </ul>
      </div>

      {customerProfile && savedShippingSummary ? (
        <div className={`mt-6 rounded-[1.4rem] border p-4 text-sm leading-6 text-slate-200 ${accentSurfaceClassName}`}>
          <p className="font-semibold text-white">Dirección guardada en tu perfil</p>
          <p className="mt-2">{savedShippingSummary}</p>
        </div>
      ) : null}
    </section>
  );
}
