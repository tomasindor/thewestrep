"use client";

import { useRef, useState, useTransition } from "react";

import { AddressForm, type AddressFormHandle } from "@/components/checkout/address-form";
import { useCart } from "@/components/cart/cart-provider";
import type { CheckoutCustomerV2 } from "@/lib/orders/checkout.shared";
import type { Provincia } from "@/lib/address/georef";
import { surfaceClassName, solidCtaClassName } from "@/lib/ui";

interface CheckoutExperienceV2Props {
  provinces: Provincia[];
}

export function CheckoutExperienceV2({ provinces }: CheckoutExperienceV2Props) {
  const { items, itemCount, clearCart } = useCart();
  const formRef = useRef<AddressFormHandle>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();

  const subtotal = items.reduce((total, item) => {
    const price = Number(item.priceDisplay.replace(/[^\d]/g, ""));
    return total + price * item.quantity;
  }, 0);

  const handleSubmit = (customer: CheckoutCustomerV2) => {
    setSubmitError(null);

    if (items.length === 0) {
      setSubmitError("El carrito está vacío.");
      return;
    }

    startSubmitting(async () => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items,
          totalAmountArs: subtotal,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { orderId?: string; reference?: string; error?: string }
        | null;

      if (!response.ok || !payload?.reference) {
        setSubmitError(payload?.error ?? "No pudimos guardar tu pedido ahora.");
        return;
      }

      clearCart();
      window.location.href = `/checkout/${payload.reference}/pending`;
    });
  };

  if (items.length === 0) {
    return (
      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h1 className="text-lg font-semibold text-white">Tu carrito está vacío</h1>
          <p className="mt-2 text-sm text-white/60">Agregá productos para continuar con el checkout.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:px-8">
        <h1 className="text-xl font-semibold text-white">Checkout</h1>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className={surfaceClassName}>
              <h2 className="text-sm font-medium text-white/80">Datos de entrega</h2>
              <div className="mt-4">
                <AddressForm ref={formRef} provinces={provinces} onSubmit={handleSubmit} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={surfaceClassName}>
              <h2 className="text-sm font-medium text-white/80">Resumen del pedido</h2>
              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">
                      {item.productName}
                      {item.variantLabel || item.sizeLabel ? (
                        <span className="text-white/40"> · {[item.variantLabel, item.sizeLabel].filter(Boolean).join(" · ")}</span>
                      ) : null}
                    </span>
                    <span className="text-white/60">x{item.quantity}</span>
                  </div>
                ))}

                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Productos ({itemCount})</span>
                    <span className="text-sm text-white">
                      ${subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => formRef.current?.triggerSubmit()}
                  disabled={isSubmitting}
                  className={`${solidCtaClassName} w-full`}
                >
                  {isSubmitting ? "Guardando..." : "Confirmar pedido"}
                </button>

                {submitError && (
                  <p className="text-center text-xs text-red-300">{submitError}</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
