"use client";

import { useState, useTransition } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { customerLoginSchema, customerRegistrationFormSchema } from "@/lib/auth/customer-credentials";
import { compactGhostCtaClassName, ghostCtaClassName, solidCtaClassName } from "@/lib/ui";

export interface CheckoutAccessCustomerAuthState {
  name: string;
  email: string;
  authProvider: "credentials" | "google";
  emailVerified?: string | null;
}

interface CheckoutAccessStepProps {
  customerAuth: CheckoutAccessCustomerAuthState | null;
  initialEmail: string;
  isEmailAuthEnabled: boolean;
  isGoogleAuthEnabled: boolean;
  onContinueAsGuest: () => void;
  onContinueWithEmail: (customer: { email: string; name: string }) => void;
  onContinueWithGoogle: () => void;
}

interface AccessFormErrors {
  confirmPassword?: string[];
  email?: string[];
  name?: string[];
  password?: string[];
}

const inputClassName =
  "w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-[rgba(210,138,163,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(210,138,163,0.24)]";

export function CheckoutAccessStep({
  customerAuth,
  initialEmail,
  isEmailAuthEnabled,
  isGoogleAuthEnabled,
  onContinueAsGuest,
  onContinueWithEmail,
  onContinueWithGoogle,
}: CheckoutAccessStepProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(customerAuth?.authProvider === "credentials" ? customerAuth.name : "");
  const [email, setEmail] = useState(
    customerAuth?.authProvider === "credentials" ? customerAuth.email : initialEmail,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AccessFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isGoogleConnected = customerAuth?.authProvider === "google";
  const isEmailConnected = customerAuth?.authProvider === "credentials";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.96),rgba(6,7,11,0.96))] p-6 sm:p-8">
      <p className="text-xs font-medium tracking-[0.32em] uppercase text-[#f1d2dc]/72">Acceso antes del checkout</p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-4xl leading-none text-white sm:text-6xl">Elegí cómo querés entrar antes de seguir.</h1>
          <p className="text-sm leading-6 text-slate-300 sm:text-base">
            Primero resolvemos tu acceso con cuenta, registro o Google. Después seguís al checkout con tus datos y, si hay encargue, te mostramos cómo coordinamos la importación y la entrega local.
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-[rgba(210,138,163,0.22)] bg-[rgba(210,138,163,0.08)] px-4 py-3 text-sm text-slate-200">
          <p className="font-semibold text-white">Orden del flujo</p>
          <p className="mt-1">Acceso → checkout → coordinación del pedido.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Email + contraseña</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Entrar con tu cuenta</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Ahora este paso usa cuentas customer persistidas. Podés iniciar sesión o crear la cuenta mínima para seguir con checkout autenticado.
          </p>

          {isEmailConnected ? (
            <div className="mt-6 space-y-4 rounded-[1.4rem] border border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.08)] p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Sesión customer activa</p>
              <p>
                Estás entrando con email/password como <span className="text-white">{customerAuth?.email}</span>.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => onContinueWithEmail({ email: customerAuth?.email ?? "", name: customerAuth?.name ?? "" })} className={solidCtaClassName}>
                  Seguir con esta cuenta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void signOut({ callbackUrl: "/checkout" });
                  }}
                  className={compactGhostCtaClassName}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 flex gap-2 rounded-full border border-white/10 bg-black/20 p-1 text-sm">
                {[
                  { value: "login" as const, label: "Ya tengo cuenta" },
                  { value: "register" as const, label: "Crear cuenta" },
                ].map((option) => {
                  const isSelected = mode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMode(option.value);
                        setErrors({});
                        setSubmitError(null);
                      }}
                      className={`flex-1 rounded-full px-4 py-2 transition ${
                        isSelected ? "bg-white text-black" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitError(null);

                  const validatedFields =
                    mode === "register"
                      ? customerRegistrationFormSchema.safeParse({ name, email, password, confirmPassword })
                      : customerLoginSchema.safeParse({ email, password });

                  if (!validatedFields.success) {
                    setErrors(validatedFields.error.flatten().fieldErrors);
                    return;
                  }

                  setErrors({});

                  startTransition(async () => {
                    if (!isEmailAuthEnabled) {
                      setSubmitError("El acceso por email todavía no está disponible en este entorno.");
                      return;
                    }

                    if (mode === "register" && "name" in validatedFields.data) {
                      const response = await fetch("/api/customer-auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: validatedFields.data.name,
                          email: validatedFields.data.email,
                          password: validatedFields.data.password,
                        }),
                      });
                      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

                      if (!response.ok) {
                        setSubmitError(payload?.error ?? "No pudimos crear tu cuenta ahora.");
                        return;
                      }
                    }

                    const result = await signIn("customer-credentials", {
                      email: validatedFields.data.email,
                      password: validatedFields.data.password,
                      redirect: false,
                      callbackUrl: "/checkout",
                    });

                    if (result?.error) {
                      setSubmitError(
                        mode === "register"
                          ? "La cuenta se creó, pero no pudimos abrir la sesión automáticamente. Probá entrar de nuevo."
                          : "No encontramos una cuenta customer válida con ese email y contraseña.",
                      );
                      return;
                    }

                    onContinueWithEmail({
                      email: validatedFields.data.email,
                      name: mode === "register" ? name.trim() : "",
                    });
                    router.refresh();
                  });
                }}
              >
                {mode === "register" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white">Nombre completo</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="Ej: Gonzalo Pérez"
                      className={`${inputClassName} ${errors.name ? "border-red-300/60" : ""}`}
                    />
                    {errors.name?.length ? <p className="text-sm text-red-200">{errors.name[0]}</p> : null}
                  </label>
                ) : null}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    className={`${inputClassName} ${errors.email ? "border-red-300/60" : ""}`}
                  />
                  {errors.email?.length ? <p className="text-sm text-red-200">{errors.email[0]}</p> : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Contraseña</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputClassName} ${errors.password ? "border-red-300/60" : ""}`}
                  />
                  {errors.password?.length ? (
                    <ul className="space-y-1 text-sm text-red-200">
                      {errors.password.map((error) => (
                        <li key={error}>• {error}</li>
                      ))}
                    </ul>
                  ) : null}
                </label>

                {mode === "register" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white">Repetir contraseña</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="Repetí tu contraseña"
                      className={`${inputClassName} ${errors.confirmPassword ? "border-red-300/60" : ""}`}
                    />
                    {errors.confirmPassword?.length ? <p className="text-sm text-red-200">{errors.confirmPassword[0]}</p> : null}
                  </label>
                ) : null}

                {submitError ? <p className="text-sm text-red-200">{submitError}</p> : null}

                <button
                  type="submit"
                  disabled={isPending || !isEmailAuthEnabled}
                  className={`${solidCtaClassName} w-full disabled:pointer-events-none disabled:opacity-45`}
                >
                  {isPending
                    ? mode === "register"
                      ? "Creando cuenta..."
                      : "Entrando..."
                    : mode === "register"
                      ? "Crear cuenta y continuar"
                      : "Continuar con email"}
                </button>

                {!isEmailAuthEnabled ? (
                  <p className="text-sm text-slate-400">
                    Falta una base de datos disponible para persistir cuentas customer. Mientras tanto, seguí con Google o como invitado.
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    {mode === "register"
                      ? "Creamos tu cuenta customer y seguís directo al checkout sin pasos extra."
                      : "Entrás con tu cuenta customer y el checkout retoma tu identidad al instante."}
                  </p>
                )}
              </form>
            </>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Google</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Seguir con Google</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {isGoogleConnected
                ? `Ya tenés una sesión customer activa como ${customerAuth?.email}.`
                : isGoogleAuthEnabled
                  ? "Usá Google para abrir el login real, volver autenticado y precargar nombre y mail en el checkout. También guardamos la cuenta customer en storage persistido."
                  : "Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET para habilitar este acceso."}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={!isGoogleConnected && !isGoogleAuthEnabled}
                onClick={() => {
                  if (isGoogleConnected) {
                    onContinueWithGoogle();
                    return;
                  }

                  void signIn("google", { callbackUrl: "/checkout?access=google" }, { prompt: "select_account" });
                }}
                className={`${solidCtaClassName} w-full disabled:pointer-events-none disabled:opacity-45`}
              >
                {isGoogleConnected ? "Seguir con esta cuenta" : "Continuar con Google"}
              </button>

              {isGoogleConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    void signOut({ callbackUrl: "/checkout" });
                  }}
                  className={`${compactGhostCtaClassName} w-full justify-center`}
                >
                  Desconectar Google
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Invitado</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Seguir sin cuenta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Mantenemos el camino guest para no romper el checkout actual. Vas a completar tus datos manualmente y seguís sin bloqueo extra.
            </p>

            <button type="button" onClick={onContinueAsGuest} className={`${ghostCtaClassName} mt-6 w-full justify-center`}>
              Continuar como invitado
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}
