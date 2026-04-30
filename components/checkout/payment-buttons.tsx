"use client";

import { useState, useTransition } from "react";

import { solidCtaClassName, ghostCtaClassName } from "@/lib/ui";

interface PaymentButtonsProps {
  orderId: string;
  reference: string;
  totalAmountArs: number;
  whatsappUrl: string;
}

export function PaymentButtons({ orderId, reference, totalAmountArs, whatsappUrl }: PaymentButtonsProps) {
  const [mpError, setMpError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();

  const handleMercadoPago = async () => {
    setMpError(null);
    startLoading(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "mercadopago" }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { checkoutUrl?: string; error?: string }
          | null;

        if (!response.ok || !payload?.checkoutUrl) {
          setMpError(payload?.error ?? "No pudimos iniciar Mercado Pago ahora.");
          return;
        }

        window.location.href = payload.checkoutUrl;
      } catch {
        setMpError("No pudimos iniciar Mercado Pago ahora.");
      }
    });
  };

  return (
    <div className="mt-6 space-y-3">
      <button
        onClick={handleMercadoPago}
        disabled={isLoading}
        className={`${solidCtaClassName} w-full`}
      >
        {isLoading ? "Cargando..." : "Pagar con Mercado Pago"}
      </button>

      {mpError && (
        <p className="text-center text-xs text-red-300">{mpError}</p>
      )}

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ghostCtaClassName} w-full`}
      >
        Coordinar por WhatsApp
      </a>
    </div>
  );
}
