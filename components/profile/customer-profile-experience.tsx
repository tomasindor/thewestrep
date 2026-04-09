"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";
import { buildCustomerProfileShippingSummary } from "@/lib/auth/customer-profile-fields";
import { compactGhostCtaClassName, inputClassName, solidCtaClassName, surfaceClassName } from "@/lib/ui";

interface CustomerProfileExperienceProps {
  initialProfile: CustomerProfileSnapshot;
}

export function CustomerProfileExperience({ initialProfile }: CustomerProfileExperienceProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const shippingSummary = useMemo(() => buildCustomerProfileShippingSummary(profile), [profile]);

  return (
    <main className="flex-1 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.96),rgba(6,7,11,0.96))] p-6 sm:p-8">
          <p className="text-xs font-medium tracking-[0.32em] uppercase text-[#f1d2dc]/72">Perfil customer</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="font-display text-4xl leading-none text-white sm:text-6xl">Tu cuenta lista para comprar más rápido.</h1>
              <p className="text-sm leading-6 text-slate-300 sm:text-base">
                Guardá tus datos de contacto y entrega para que el checkout arranque mejor resuelto la próxima vez.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-left text-xs text-slate-300">
                <span className="block tracking-[0.22em] uppercase text-[#f1d2dc]/70">Perfil</span>
                <span className="mt-1 block text-sm font-semibold text-white">
                  {profile.firstName && profile.lastName ? "Datos customer listos" : "Completá tu perfil"}
                </span>
              </div>
              <Link href="/historial" className={compactGhostCtaClassName}>
                Ver historial
              </Link>
              <Link href="/checkout" className={solidCtaClassName}>
                Ir al checkout
              </Link>
              <Link href="/catalogo" className={compactGhostCtaClassName}>
                Seguir comprando
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              setFeedback(null);

              startTransition(async () => {
                const response = await fetch("/api/customer-profile", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    phone: profile.phone,
                    preferredChannel: profile.preferredChannel,
                    shippingStreet: profile.shippingStreet,
                    shippingStreetNumber: profile.shippingStreetNumber,
                    shippingAddressLine2: profile.shippingAddressLine2,
                    shippingCity: profile.shippingCity,
                    shippingProvince: profile.shippingProvince,
                    shippingPostalCode: profile.shippingPostalCode,
                  }),
                });
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string; profile?: CustomerProfileSnapshot }
                  | null;

                if (!response.ok || !payload?.profile) {
                  setFeedback({ tone: "error", message: payload?.error ?? "No pudimos guardar tu perfil ahora." });
                  return;
                }

                setProfile(payload.profile);
                setFeedback({ tone: "success", message: "Guardamos tu perfil customer." });
              });
            }}
          >
            <section className={surfaceClassName}>
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Identidad</p>
                <h2 className="text-2xl font-semibold text-white">Contacto principal</h2>
                <p className="text-sm leading-6 text-slate-300">
                  Estos datos alimentan el saludo del sitio y la base del checkout autenticado.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Nombre *</span>
                  <input
                    value={profile.firstName}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        firstName: event.target.value,
                        name: [event.target.value, current.lastName].filter(Boolean).join(" ").trim(),
                      }))
                    }
                    className={inputClassName}
                    placeholder="Ej: Gonzalo"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Apellido *</span>
                  <input
                    value={profile.lastName}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        lastName: event.target.value,
                        name: [current.firstName, event.target.value].filter(Boolean).join(" ").trim(),
                      }))
                    }
                    className={inputClassName}
                    placeholder="Ej: Pérez"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Email</span>
                  <input value={profile.email} disabled className={`${inputClassName} cursor-not-allowed opacity-70`} />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Teléfono</span>
                  <input
                    value={profile.phone}
                    onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                    className={inputClassName}
                    placeholder="Ej: +54 9 11 5555 5555"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Canal preferido</span>
                  <select
                    value={profile.preferredChannel}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        preferredChannel: event.target.value as CustomerProfileSnapshot["preferredChannel"],
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="">Elegir canal</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">Mail</option>
                  </select>
                </label>
              </div>
            </section>

            <section className={surfaceClassName}>
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Entrega</p>
                <h2 className="text-2xl font-semibold text-white">Dirección base para envíos</h2>
                <p className="text-sm leading-6 text-slate-300">
                  No reemplaza la coordinación final, pero deja el checkout mucho mejor prearmado.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Calle</span>
                  <input
                    value={profile.shippingStreet}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        shippingStreet: event.target.value,
                        shippingAddressLine1: [event.target.value, current.shippingStreetNumber].filter(Boolean).join(" ").trim(),
                      }))
                    }
                    className={inputClassName}
                    placeholder="Ej: Nicaragua"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Altura</span>
                  <input
                    value={profile.shippingStreetNumber}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        shippingStreetNumber: event.target.value,
                        shippingAddressLine1: [current.shippingStreet, event.target.value].filter(Boolean).join(" ").trim(),
                      }))
                    }
                    className={inputClassName}
                    placeholder="Ej: 5400"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-white">Depto / piso / referencia</span>
                  <input
                    value={profile.shippingAddressLine2}
                    onChange={(event) => setProfile((current) => ({ ...current, shippingAddressLine2: event.target.value }))}
                    className={inputClassName}
                    placeholder="Ej: Piso 4, depto B"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Ciudad</span>
                  <input
                    value={profile.shippingCity}
                    onChange={(event) => setProfile((current) => ({ ...current, shippingCity: event.target.value }))}
                    className={inputClassName}
                    placeholder="Ej: CABA"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Provincia</span>
                  <input
                    value={profile.shippingProvince}
                    onChange={(event) => setProfile((current) => ({ ...current, shippingProvince: event.target.value }))}
                    className={inputClassName}
                    placeholder="Ej: Buenos Aires"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Código postal</span>
                  <input
                    value={profile.shippingPostalCode}
                    onChange={(event) => setProfile((current) => ({ ...current, shippingPostalCode: event.target.value }))}
                    className={inputClassName}
                    placeholder="Ej: C1414"
                  />
                </label>
              </div>
            </section>

            {feedback ? (
              <p
                className={`rounded-[1.2rem] border px-4 py-3 text-sm ${
                  feedback.tone === "success"
                    ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-50"
                    : "border-red-300/30 bg-red-500/10 text-red-100"
                }`}
              >
                {feedback.message}
              </p>
            ) : null}

            <button type="submit" disabled={isPending} className={`${solidCtaClassName} w-full disabled:pointer-events-none disabled:opacity-45`}>
              {isPending ? "Guardando perfil..." : "Guardar perfil"}
            </button>
          </form>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className={surfaceClassName}>
              <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Estado actual</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Lo que ya queda precargado</h2>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <li>• Nombre: {profile.firstName || "Pendiente"}</li>
                <li>• Apellido: {profile.lastName || "Pendiente"}</li>
                <li>• Email: {profile.email}</li>
                <li>• Teléfono: {profile.phone || "Pendiente"}</li>
                <li>• Canal preferido: {profile.preferredChannel || "Pendiente"}</li>
              </ul>
            </section>

            <section className={surfaceClassName}>
              <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Entrega guardada</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Resumen logístico</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {shippingSummary || "Todavía no guardaste una dirección base para envíos."}
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
