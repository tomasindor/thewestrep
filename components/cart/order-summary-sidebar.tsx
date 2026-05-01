"use client";

import Link from "next/link";

import type { CartCustomerProfile, CartItem } from "@/lib/cart/types";
import { SmartImage } from "@/components/ui/smart-image";
import { getProductImageUrlForContext } from "@/lib/media/product-images";
import { formatArs } from "@/lib/utils";
import {
  getCheckoutModeConfirmation,
  getCheckoutModeLabel,
  getFulfillmentCopy,
  getProductHref,
  getSelectionCopy,
} from "@/lib/orders/checkout.shared";
import { ghostCtaClassName, solidCtaClassName, surfaceClassName } from "@/lib/ui";

const accentEyebrowClassName = "text-[#f1d2dc]/72";
const accentTextClassName = "text-[#f4d7e0]";
const accentBadgeClassName = "border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.12)] text-[#f4d7e0]";

interface SubmittedOrder {
  authProvider: "guest" | "credentials" | "google";
  checkoutMode: "guest" | "account";
  customerAccountId: string | null;
  payment: {
    checkoutUrl: string;
    externalReference: string;
    preferenceId: string;
    provider: "mercadopago";
    sandboxCheckoutUrl: string | null;
  } | null;
  paymentError: string | null;
  reference: string;
  totalAmountArs: number;
  paymentMethod: "mercadopago" | "whatsapp" | null;
  paymentStatus: string;
  whatsappUrl: string | null;
}

interface OrderSummarySidebarProps {
  items: CartItem[];
  customer: CartCustomerProfile;
  subtotal: number;
  comboDiscountAmountArs: number;
  shippingFee: number;
  correoArgentinoFeeTotal: number;
  total: number;
  itemCount: number;
  hasRequiredFields: boolean;
  hasEncargueOrder: boolean;
  isSubmittingOrder: boolean;
  isSubmitted: boolean;
  submittedOrder: SubmittedOrder | null;
  submitError: string | null;
  hasTriedSubmit: boolean;
  onPlaceOrder: () => void;
  onOpenCart: () => void;
}

export function OrderSummarySidebar({
  items,
  customer,
  subtotal,
  comboDiscountAmountArs,
  shippingFee,
  correoArgentinoFeeTotal,
  total,
  itemCount,
  hasRequiredFields,
  hasEncargueOrder,
  isSubmittingOrder,
  isSubmitted,
  submittedOrder,
  submitError,
  hasTriedSubmit,
  onPlaceOrder,
  onOpenCart,
}: OrderSummarySidebarProps) {
  const paymentCallToAction = submittedOrder?.payment ? (
    <a
      href={submittedOrder.payment.checkoutUrl}
      target="_blank"
      rel="noreferrer"
      className={`${solidCtaClassName} mt-4 block w-full text-center`}
    >
      Pagar con Mercado Pago
    </a>
  ) : null;

  const whatsappCallToAction = submittedOrder?.whatsappUrl ? (
    <a
      href={submittedOrder.whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className={`${ghostCtaClassName} mt-3 block w-full text-center`}
    >
      {submittedOrder.paymentMethod === "whatsapp" ? "Abrir WhatsApp" : "Coordinar por WhatsApp"}
    </a>
  ) : null;

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <section className={surfaceClassName}>
        <div className="flex items-start gap-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${accentBadgeClassName}`}>3</span>
          <div className="space-y-2">
            <p className={`text-xs font-medium tracking-[0.28em] uppercase ${accentEyebrowClassName}`}>Resumen</p>
            <h2 className="text-2xl font-semibold text-white">Tu pedido</h2>
            <p className="text-sm leading-6 text-slate-300">Revisá productos, entrega y total estimado en un solo lugar.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {items.map((item) => {
            const productHref = getProductHref(item.availability, item.productSlug);

            return (
              <article key={item.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <Link
                      href={productHref}
                      aria-label={`Ver ${item.productName}`}
                      className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-black/20 transition hover:border-[rgba(210,138,163,0.34)]"
                    >
                      {item.productImage ? (
                        <SmartImage
                          src={getProductImageUrlForContext(item.productImage, "card")}
                          alt={item.productImage.alt}
                          fill
                          className="h-full w-full object-cover"
                          sizes="80px"
                        />
                      ) : null}
                    </Link>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{item.productName}</p>
                      <p className={`mt-1 text-sm ${accentTextClassName}`}>{item.priceDisplay}</p>
                      {getSelectionCopy(item.variantLabel, item.sizeLabel) ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {getSelectionCopy(item.variantLabel, item.sizeLabel)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55">{item.availabilityLabel}</p>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200">x{item.quantity}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between gap-4">
            <span>Subtotal productos</span>
            <span className="font-semibold text-white">{formatArs(subtotal)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span>Entrega estimada</span>
            <span className="text-right text-white/90">
              {customer.fulfillment ? (shippingFee === 0 ? "Sin cargo" : formatArs(shippingFee)) : "Elegí modalidad"}
            </span>
          </div>
          {comboDiscountAmountArs > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-4 text-emerald-200">
              <span>Descuento combo</span>
              <span className="text-right">-{formatArs(comboDiscountAmountArs)}</span>
            </div>
          ) : null}
          {hasEncargueOrder ? (
            <div className="mt-3 flex items-center justify-between gap-4">
              <span>Correo Argentino</span>
              <span className="text-right text-white/90">{formatArs(correoArgentinoFeeTotal)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-4 text-white">
            <span>Total estimado</span>
            <span className="font-semibold">{formatArs(total)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-white/80">
            <span>Unidades totales</span>
            <span className="font-semibold text-white">{itemCount}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span>Comprador</span>
            <span className="text-right text-white/90">{customer.name.trim() || "Pendiente"}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span>Destinatario</span>
            <span className="text-right text-white/90">{customer.deliveryRecipient.trim() || customer.name.trim() || "Pendiente"}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span>Modo checkout</span>
            <span className="text-right text-white/90">{getCheckoutModeLabel(customer.checkoutMode, customer.authProvider)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span>Entrega</span>
            <span className="text-right text-white/90">{getFulfillmentCopy(customer.fulfillment)?.label ?? "Pendiente"}</span>
          </div>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Antes de confirmar</p>
          <ul className="mt-3 space-y-2">
            <li>• Acceso: {getCheckoutModeLabel(customer.checkoutMode, customer.authProvider)}.</li>
            <li>• Datos obligatorios: {hasRequiredFields ? "completos" : "faltan completar"}.</li>
            <li>• Encargue asistido: {hasEncargueOrder ? "nos ocupamos de la importación y del despacho local" : "no aplica"}.</li>
            <li>• Confirmación: {isSubmitted ? `pedido guardado como ${submittedOrder?.reference}` : "pendiente"}.</li>
            <li>• Si necesitás ajustar algo, podés volver al carrito en cualquier momento.</li>
          </ul>
        </div>

        {submitError ? (
          <p className="mt-4 rounded-[1.2rem] border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {submitError}
          </p>
        ) : null}

        {hasTriedSubmit && !hasRequiredFields ? (
          <p className="mt-4 rounded-[1.2rem] border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Completá nombre, teléfono, email, modalidad y ubicación para seguir.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={isSubmittingOrder || isSubmitted}
          className={`${solidCtaClassName} mt-6 w-full disabled:pointer-events-none disabled:opacity-45`}
        >
          {isSubmittingOrder ? "Guardando pedido..." : isSubmitted ? "Pedido guardado" : "Confirmar pedido"}
        </button>

        {isSubmitted ? (
          <section className="mt-4 rounded-[1.4rem] border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-50">
            <p className="text-xs font-medium tracking-[0.28em] uppercase text-emerald-100/80">Pedido confirmado</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Tu pedido ya quedó guardado</h3>
            <p className="mt-2">
              Guardá la referencia <span className="font-semibold text-white">{submittedOrder?.reference}</span> para continuar la coordinación de tu pedido.
            </p>
            <p className="mt-2 text-emerald-50/90">
              Próximo paso: seguimos con {customer.name.trim() || "vos"} por {customer.preferredChannel || "el canal elegido"} para coordinar {getFulfillmentCopy(customer.fulfillment)?.label?.toLowerCase() ?? "la entrega"}.
            </p>
            <p className="mt-2 text-emerald-50/90">
              Total persistido: <span className="font-semibold text-white">{formatArs(submittedOrder?.totalAmountArs ?? total)}</span>.
            </p>
            <div className="mt-3 rounded-[1rem] border border-white/10 bg-white/[0.04] p-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Método de pago</span>
                <span className="text-white">{submittedOrder?.paymentMethod === "mercadopago" ? "Mercado Pago" : submittedOrder?.paymentMethod === "whatsapp" ? "WhatsApp" : "Pendiente"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-slate-300">Estado del pago</span>
                <span className="text-white">{submittedOrder?.paymentStatus}</span>
              </div>
            </div>

            {submittedOrder?.payment ? (
              <p className="mt-3 text-emerald-50/90">
                Completá el pago en Mercado Pago para confirmar tu pedido.
              </p>
            ) : submittedOrder?.paymentError ? (
              <p className="mt-3 text-amber-100">{submittedOrder.paymentError}</p>
            ) : null}

            {submittedOrder?.paymentMethod === "whatsapp" ? (
              <p className="mt-3 text-emerald-50/90">
                Te contactaremos por WhatsApp para coordinar el pago y la entrega.
              </p>
            ) : null}

            <p className="mt-3 text-emerald-50/90">
              {submittedOrder?.checkoutMode === "account"
                ? submittedOrder.customerAccountId
                  ? "Este pedido quedó enlazado con tu cuenta para historial futuro."
                  : "El pedido quedó marcado como checkout con cuenta, pero sin vínculo persistido de sesión."
                : "Este pedido quedó guardado como invitado con snapshot completo de contacto y entrega."}
            </p>
            <p className="mt-2 text-emerald-50/90">{getCheckoutModeConfirmation(customer.checkoutMode, customer.authProvider)}</p>
            {paymentCallToAction}
            {whatsappCallToAction}
          </section>
        ) : null}

        <button type="button" onClick={onOpenCart} className={`${solidCtaClassName} mt-6 w-full`}>
          Editar carrito
        </button>
      </section>
    </aside>
  );
}
