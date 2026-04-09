"use client";

import { useEffect } from "react";

import { formatArs } from "@/lib/utils";
import { solidCtaClassName } from "@/lib/ui";
import { CORREO_ARGENTINO_FEE } from "@/lib/cart/assisted-orders";

const accentEyebrowClassName = "text-[#f1d2dc]/72";
const accentSurfaceClassName = "border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.08)]";

interface AssistedOrderModalProps {
  hasEncargueOrder: boolean;
  requiresAssistedOrderAcknowledgement: boolean;
  acceptedAssistedOrderSignature: string;
  checkedAssistedOrderSignature: string;
  assistedOrderSignature: string;
  correoArgentinoFeeTotal: number;
  onAccept: () => void;
  onCheck: (checked: boolean, signature: string) => void;
}

export function AssistedOrderModal({
  hasEncargueOrder,
  requiresAssistedOrderAcknowledgement,
  acceptedAssistedOrderSignature,
  checkedAssistedOrderSignature,
  assistedOrderSignature,
  correoArgentinoFeeTotal,
  onAccept,
  onCheck,
}: AssistedOrderModalProps) {
  const hasCheckedAssistedOrderTerms = checkedAssistedOrderSignature === assistedOrderSignature;

  useEffect(() => {
    if (!hasEncargueOrder || !requiresAssistedOrderAcknowledgement) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hasEncargueOrder, requiresAssistedOrderAcknowledgement]);

  if (!hasEncargueOrder || !requiresAssistedOrderAcknowledgement) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgba(4,6,10,0.88)] backdrop-blur-md" />

      <section className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-6">
        <div className="space-y-2">
          <p className={`text-[11px] font-medium tracking-[0.26em] uppercase ${accentEyebrowClassName}`}>Aceptación obligatoria</p>
          <h2 className="text-3xl font-semibold leading-none text-white sm:text-[2.4rem]">
            Encargue internacional asistido puerta a puerta
          </h2>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
          <p>
            Este checkout incluye un encargue internacional asistido con seguimiento hasta la entrega.
          </p>
          <p>
            Correo Argentino agrega un cargo fijo único de {formatArs(CORREO_ARGENTINO_FEE)} por pedido asistido, independientemente de cuántos productos tenga el carrito.
          </p>
          <p>
            Los tiempos que compartimos son estimados y pueden moverse según operador, aduana y correo local. En situaciones puntuales puede hacer falta validar datos del destinatario final.
          </p>
        </div>

        <div className={`mt-5 rounded-[1.4rem] border p-4 text-sm leading-6 text-slate-200 ${accentSurfaceClassName}`}>
          <p className="font-semibold text-white">Resumen del pedido</p>
          <ul className="mt-3 space-y-2">
            <li>• Gestión asistida puerta a puerta hasta la entrega</li>
            <li>• Correo Argentino fijo: {formatArs(correoArgentinoFeeTotal)}</li>
            <li>• Puede requerirse validar datos del destinatario final</li>
          </ul>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">
          <input
            type="checkbox"
            checked={hasCheckedAssistedOrderTerms}
            onChange={(event) => onCheck(event.target.checked, assistedOrderSignature)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[rgba(210,138,163,0.9)] focus:ring-[rgba(210,138,163,0.4)]"
          />
          <span>Entiendo las condiciones del encargue asistido puerta a puerta y acepto continuar con este checkout.</span>
        </label>

        <button
          type="button"
          onClick={onAccept}
          disabled={!hasCheckedAssistedOrderTerms}
          className={`${solidCtaClassName} mt-6 w-full disabled:pointer-events-none disabled:opacity-45`}
        >
          Aceptar y continuar
        </button>
      </section>
    </div>
  );
}
