"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { formatArs } from "@/lib/utils";
import { compactSolidCtaClassName, ghostCtaClassName, solidCtaClassName } from "@/lib/ui";

function getSelectionCopy(variantLabel?: string, sizeLabel?: string) {
  return [variantLabel, sizeLabel].filter(Boolean).join(" · ");
}

const surfaceClassName = "rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6";

const inputClassName =
  "w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-orange-300/50 focus:outline-none focus:ring-2 focus:ring-orange-300/30";

const fulfillmentOptions = [
  {
    value: "retiro",
    label: "Retiro coordinado",
    description: "Coordinás punto y horario después de confirmar el pedido.",
    fee: 0,
  },
  {
    value: "envio-caba-gba",
    label: "Envío CABA/GBA",
    description: "Estimación simple para entrega urbana o por mensajería.",
    fee: 6500,
  },
  {
    value: "envio-interior",
    label: "Envío al interior",
    description: "Referencia inicial para despacho nacional, a confirmar luego.",
    fee: 12000,
  },
] as const;

function getPriceAmount(priceDisplay: string) {
  const normalizedValue = Number(priceDisplay.replace(/[^\d]/g, ""));

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

function getFulfillmentCopy(value: "" | "retiro" | "envio-caba-gba" | "envio-interior") {
  return fulfillmentOptions.find((option) => option.value === value);
}

function getLocationLabel(value: "" | "retiro" | "envio-caba-gba" | "envio-interior") {
  if (value === "retiro") {
    return "Punto o zona para coordinar retiro";
  }

  if (value === "envio-caba-gba") {
    return "Dirección o barrio de entrega";
  }

  if (value === "envio-interior") {
    return "Ciudad, provincia y referencia de envío";
  }

  return "Zona, dirección o punto de entrega";
}

export function CheckoutExperience() {
  const { customer, isHydrated, itemCount, items, openCart, updateCustomer } = useCart();
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + getPriceAmount(item.priceDisplay) * item.quantity, 0),
    [items],
  );
  const shippingFee = getFulfillmentCopy(customer.fulfillment)?.fee ?? 0;
  const total = subtotal + shippingFee;
  const requiredLocation = customer.location.trim();
  const hasRequiredFields = Boolean(
    customer.name.trim() && customer.contact.trim() && customer.fulfillment && requiredLocation,
  );
  const isSubmitted = confirmationCode.length > 0;

  const handlePlaceOrder = () => {
    setHasTriedSubmit(true);

    if (!hasRequiredFields) {
      return;
    }

    setConfirmationCode(`TWR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`);
  };

  return (
    <main className="flex-1 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.96),rgba(6,7,11,0.96))] p-6 sm:p-8">
          <p className="text-xs font-medium tracking-[0.32em] text-orange-200/75 uppercase">Checkout thewestrep</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="font-display text-4xl leading-none text-white sm:text-6xl">Base inicial para cerrar el pedido fuera del carrito.</h1>
              <p className="text-sm leading-6 text-slate-300 sm:text-base">
                El checkout ya vive en su propia ruta. Ahora sí tiene datos reales del comprador, modalidad de entrega y un cierre simulado para revisar el pedido con lógica más creíble.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">
                {isHydrated ? `${items.length} productos` : "Cargando carrito"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">{itemCount} unidades</span>
            </div>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-xs font-medium tracking-[0.28em] text-orange-200/75 uppercase">Checkout vacío</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Todavía no hay productos para cerrar.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Sumá productos desde stock o encargue y después volvés acá con el resumen listo para avanzar.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/stock" className={solidCtaClassName}>
                Explorar stock
              </Link>
              <Link href="/catalogo" className={ghostCtaClassName}>
                Ver catálogos
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className={surfaceClassName}>
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-300/30 bg-orange-500/10 text-sm font-semibold text-orange-100">1</span>
                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-[0.28em] text-orange-200/75 uppercase">Comprador</p>
                    <h2 className="text-2xl font-semibold text-white">Quién recibe la confirmación</h2>
                    <p className="text-sm leading-6 text-slate-300">
                      Dejamos persistidos los datos clave en el checkout para que el pedido tenga contexto real sin salir del cliente.
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
                    <span className="text-sm font-medium text-white">WhatsApp o email *</span>
                    <input
                      value={customer.contact}
                      onChange={(event) => updateCustomer("contact", event.target.value)}
                      placeholder="Ej: +54 9 11 5555 5555"
                      className={`${inputClassName} ${hasTriedSubmit && !customer.contact.trim() ? "border-red-300/60" : ""}`}
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
                    <span className="text-sm font-medium text-white">Contexto del cliente</span>
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

                <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  <p className="font-semibold text-white">Checklist mínimo del comprador</p>
                  <ul className="mt-3 space-y-2">
                    <li>• Nombre para identificar el pedido.</li>
                    <li>• Contacto para seguimiento o coordinación.</li>
                    <li>• Canal y contexto opcional para ordenar mejor la atención.</li>
                  </ul>
                </div>
              </section>

              <section className={surfaceClassName}>
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-300/30 bg-orange-500/10 text-sm font-semibold text-orange-100">2</span>
                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-[0.28em] text-orange-200/75 uppercase">Entrega o retiro</p>
                    <h2 className="text-2xl font-semibold text-white">Cómo querés recibirlo</h2>
                    <p className="text-sm leading-6 text-slate-300">
                      La modalidad elegida ajusta el resumen final con una referencia logística simple y deja guardado el contexto del pedido.
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
                            ? "border-orange-300/55 bg-orange-500/12"
                            : "border-white/10 bg-black/20 hover:border-orange-300/30"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{option.label}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{option.description}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white">
                            {option.fee === 0 ? "Sin cargo" : `+ ${formatArs(option.fee)}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white">{getLocationLabel(customer.fulfillment)} *</span>
                    <input
                      value={customer.location}
                      onChange={(event) => updateCustomer("location", event.target.value)}
                      placeholder="Ej: Palermo, CABA / Rosario, Santa Fe / Punto a coordinar"
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

                <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  <p className="font-semibold text-white">Qué queda claro en esta etapa</p>
                  <ul className="mt-3 space-y-2">
                    <li>• La modalidad ya impacta el total estimado.</li>
                    <li>• La ubicación sirve como referencia para coordinar.</li>
                    <li>• No hay pagos reales ni cálculo logístico definitivo todavía.</li>
                  </ul>
                </div>
              </section>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <section className={surfaceClassName}>
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-300/30 bg-orange-500/10 text-sm font-semibold text-orange-100">3</span>
                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-[0.28em] text-orange-200/75 uppercase">Resumen corto</p>
                    <h2 className="text-2xl font-semibold text-white">Tu pedido</h2>
                    <p className="text-sm leading-6 text-slate-300">Ahora el resumen cierra con comprador, entrega elegida y total estimado dentro del mismo flujo.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {items.map((item) => (
                    <article key={item.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.productName}</p>
                          <p className="mt-1 text-sm text-orange-100">{item.priceDisplay}</p>
                          {getSelectionCopy(item.variantLabel, item.sizeLabel) ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                              {getSelectionCopy(item.variantLabel, item.sizeLabel)}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55">{item.availabilityLabel}</p>
                        </div>

                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200">x{item.quantity}</span>
                      </div>
                    </article>
                  ))}
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
                    <span>Entrega</span>
                    <span className="text-right text-white/90">{getFulfillmentCopy(customer.fulfillment)?.label ?? "Pendiente"}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  <p className="font-semibold text-white">Estado del checkout</p>
                  <ul className="mt-3 space-y-2">
                    <li>• Datos obligatorios: {hasRequiredFields ? "completos" : "faltan completar"}.</li>
                    <li>• Confirmación: {isSubmitted ? `lista con código ${confirmationCode}` : "simulada, todavía no enviada"}.</li>
                    <li>• Carrito: sigue editable desde el drawer.</li>
                  </ul>
                </div>

                {hasTriedSubmit && !hasRequiredFields ? (
                  <p className="mt-4 rounded-[1.2rem] border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    Completá nombre, contacto, modalidad y ubicación para cerrar esta simulación de checkout.
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className={`${solidCtaClassName} mt-6 w-full`}
                >
                  {isSubmitted ? "Actualizar simulación del pedido" : "Confirmar pedido (simulado)"}
                </button>

                {isSubmitted ? (
                  <section className="mt-4 rounded-[1.4rem] border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-50">
                    <p className="text-xs font-medium tracking-[0.28em] uppercase text-emerald-100/80">Confirmación simulada</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Pedido listo para seguimiento manual</h3>
                    <p className="mt-2">
                      Generamos la referencia <span className="font-semibold text-white">{confirmationCode}</span> para que el flujo se sienta completo sin tocar pasarela ni backend.
                    </p>
                    <p className="mt-2 text-emerald-50/90">
                      Próximo paso realista: contactar a {customer.name.trim() || "la persona compradora"} por {customer.preferredChannel || "el canal elegido"} y coordinar {getFulfillmentCopy(customer.fulfillment)?.label?.toLowerCase() ?? "la entrega"}.
                    </p>
                  </section>
                ) : null}

                <button type="button" onClick={openCart} className={`${solidCtaClassName} mt-6 w-full`}>
                  Editar carrito
                </button>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Sin pagos reales ni backend: este cierre es puramente client-side y deja preparado el terreno para una integración posterior.
                </p>
              </section>

              <section className={`${surfaceClassName} space-y-3`}>
                <p className="text-xs font-medium tracking-[0.28em] text-orange-200/75 uppercase">Siguiente etapa</p>
                <h3 className="text-xl font-semibold text-white">Integrar validación fina y coordinación real</h3>
                <p className="text-sm leading-6 text-slate-300">
                  Esta tanda ya cubre experiencia, persistencia local y resumen estimado. Lo próximo puede sumar validaciones más duras, integración operativa o mensaje automático.
                </p>
                <Link href="/catalogo" className={compactSolidCtaClassName}>
                  Seguir viendo catálogo
                </Link>
              </section>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
