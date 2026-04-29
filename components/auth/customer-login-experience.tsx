"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/cart-provider";
import type { CheckoutAccessCustomerAuthState } from "@/components/cart/checkout-access-step";
import { executeCustomerCredentialsFlow } from "@/lib/auth/customer-auth-client";
import { customerLoginSchema, customerRegistrationFormSchema } from "@/lib/auth/customer-credentials";
import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";
import { compactGhostCtaClassName, ghostCtaClassName, inputClassName, solidCtaClassName } from "@/lib/ui";

interface AccessFormErrors {
  confirmPassword?: string[];
  email?: string[];
  name?: string[];
  password?: string[];
}

interface CustomerLoginExperienceProps {
  customerAuth: CheckoutAccessCustomerAuthState | null;
  isEmailAuthEnabled: boolean;
  isGoogleAuthEnabled: boolean;
  shouldAutoAdvanceGoogleAccess: boolean;
  returnUrl?: string;
  initialMode?: "login" | "register";
  oauthError?: string;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path fill="#EA4335" d="M12 10.2v3.95h5.49c-.24 1.27-.96 2.34-2.05 3.07l3.31 2.57c1.93-1.78 3.04-4.4 3.04-7.51 0-.73-.07-1.43-.2-2.1H12Z" />
      <path fill="#4285F4" d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.31-2.57c-.91.61-2.08.97-3.46.97-2.66 0-4.92-1.8-5.73-4.22l-3.42 2.64A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.27 13.71A6.02 6.02 0 0 1 5.95 12c0-.59.1-1.15.28-1.69L2.81 7.67A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.47l3.19-2.76Z" />
      <path fill="#34A853" d="M12 6.07c1.5 0 2.85.52 3.92 1.55l2.94-2.94C17.07 3.02 14.76 2 12 2a10 10 0 0 0-8.92 5.67l3.42 2.64c.81-2.43 3.07-4.24 5.5-4.24Z" />
    </svg>
  );
}

export function CustomerLoginExperience({
  customerAuth,
  isEmailAuthEnabled,
  isGoogleAuthEnabled,
  shouldAutoAdvanceGoogleAccess,
  returnUrl,
  initialMode = "login",
  oauthError,
}: CustomerLoginExperienceProps) {
  const router = useRouter();
  const { customer, updateCustomer } = useCart();
  const safeReturnUrl = useMemo(() => sanitizeAuthReturnUrl(returnUrl, "/"), [returnUrl]);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState(customerAuth?.authProvider === "credentials" ? customerAuth.name : customer.name);
  const [email, setEmail] = useState(
    customerAuth?.authProvider === "credentials" ? customerAuth.email : customer.email,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AccessFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotPending, setForgotPending] = useState(false);

  const isGoogleConnected = customerAuth?.authProvider === "google";
  const isEmailConnected = customerAuth?.authProvider === "credentials";

  const goToCheckout = useCallback(() => {
    router.push(safeReturnUrl);
  }, [router, safeReturnUrl]);

  const startGoogleCustomerSignIn = useCallback(() => {
    window.location.href = `/api/customer-auth/google?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
  }, [safeReturnUrl]);

  const resolveGuestAccess = () => {
    updateCustomer("checkoutMode", "guest");
    updateCustomer("authProvider", "");
    goToCheckout();
  };

  const resolveAuthenticatedAccess = useCallback(
    (authProvider: "credentials" | "google", nextName: string, nextEmail: string) => {
      updateCustomer("checkoutMode", "account");
      updateCustomer("authProvider", authProvider);
      updateCustomer("email", nextEmail);

      if (!customer.name.trim() && nextName.trim()) {
        updateCustomer("name", nextName.trim());
      }

      if (!customer.preferredChannel) {
        updateCustomer("preferredChannel", "email");
      }

      goToCheckout();
    },
    [customer.name, customer.preferredChannel, goToCheckout, updateCustomer],
  );

  useEffect(() => {
    if (!shouldAutoAdvanceGoogleAccess || customerAuth?.authProvider !== "google") {
      return;
    }

    resolveAuthenticatedAccess("google", customerAuth.name, customerAuth.email);
  }, [customerAuth, resolveAuthenticatedAccess, shouldAutoAdvanceGoogleAccess]);

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setForgotSent(false);
    setForgotEmail("");
    setForgotError(null);
  };

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-6 sm:px-8 sm:py-8">
      <div className="w-full max-w-md">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white sm:text-[2rem]">Entrá a tu cuenta</h1>
          </div>

          <div className="mt-5 space-y-4">
            {showForgotPassword ? (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-semibold text-white">¿Olvidaste tu contraseña?</h2>
                  <p className="text-sm leading-6 text-slate-400">
                    Ingresá tu email y te enviamos un link para resetear tu contraseña.
                  </p>
                </div>
                {forgotSent ? (
                  <div className="space-y-4 rounded-[1.4rem] border border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.08)] p-4 text-sm text-slate-200">
                    <p className="font-semibold text-white">Email enviado</p>
                    <p>
                      Si tu email está registrado, recibirás un link para resetear tu contraseña.
                    </p>
                    <button
                      type="button"
                      onClick={resetForgotPasswordState}
                      className={`${compactGhostCtaClassName} w-full justify-center`}
                    >
                      Volver al login
                    </button>
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setForgotError(null);
                      setForgotPending(true);

                      try {
                        const response = await fetch("/api/customer/forgot-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: forgotEmail }),
                        });

                        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

                        if (!response.ok) {
                          setForgotError(payload?.error ?? "No pudimos procesar tu solicitud.");
                          return;
                        }

                        setForgotSent(true);
                      } catch {
                        setForgotError("Ocurrió un error inesperado. Intentá de nuevo.");
                      } finally {
                        setForgotPending(false);
                      }
                    }}
                  >
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-white">Email</span>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(event) => setForgotEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="nombre@correo.com"
                        className={inputClassName}
                      />
                    </label>

                    {forgotError && <p className="text-sm text-red-200">{forgotError}</p>}

                    <button
                      type="submit"
                      disabled={forgotPending}
                      className={`${solidCtaClassName} w-full disabled:pointer-events-none disabled:opacity-45`}
                    >
                      {forgotPending ? "Enviando..." : "Enviar link de reset"}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={resetForgotPasswordState}
                  className={`${compactGhostCtaClassName} w-full justify-center`}
                >
                  Cancelar
                </button>
              </div>
            ) : isEmailConnected ? (
              <div className="space-y-4 rounded-[1.4rem] border border-[rgba(210,138,163,0.2)] bg-[rgba(210,138,163,0.08)] p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">Sesión activa</p>
                <p>
                  Ya estás entrando como <span className="text-white">{customerAuth?.email}</span>.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => resolveAuthenticatedAccess("credentials", customerAuth?.name ?? "", customerAuth?.email ?? "")}
                    className={`${solidCtaClassName} w-full`}
                  >
                    Continuar al checkout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut({ callbackUrl: "/login" });
                    }}
                    className={`${compactGhostCtaClassName} w-full justify-center`}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 rounded-full border border-white/10 bg-black/20 p-1 text-sm">
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
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSubmitError(null);

                    if (mode === "register") {
                      const validatedRegistration = customerRegistrationFormSchema.safeParse({
                        name,
                        email,
                          password,
                          confirmPassword,
                        });

                      if (!validatedRegistration.success) {
                        setErrors(validatedRegistration.error.flatten().fieldErrors);
                        return;
                      }

                      const { data } = validatedRegistration;
                      setErrors({});

                      startTransition(async () => {
                        if (!isEmailAuthEnabled) {
                          setSubmitError("El acceso por email todavía no está disponible en este entorno.");
                          return;
                        }

                        const flowResult = await executeCustomerCredentialsFlow({
                          mode: "register",
                          name: data.name,
                          email: data.email,
                          password: data.password,
                          returnUrl: safeReturnUrl,
                        });

                        if (!flowResult.ok) {
                          setSubmitError(flowResult.error);

                          if (flowResult.code === "duplicate_email" || flowResult.code === "google_account_exists") {
                            setName("");
                            setEmail("");
                            setPassword("");
                            setConfirmPassword("");
                            setErrors({});
                          }

                          return;
                        }

                        router.push(flowResult.redirectTo);
                      });

                      return;
                    }

                    const validatedLogin = customerLoginSchema.safeParse({ email, password });

                    if (!validatedLogin.success) {
                      setErrors(validatedLogin.error.flatten().fieldErrors);
                      return;
                    }

                    const { data } = validatedLogin;
                    setErrors({});

                    startTransition(async () => {
                      if (!isEmailAuthEnabled) {
                        setSubmitError("El acceso por email todavía no está disponible en este entorno.");
                        return;
                      }

                      const flowResult = await executeCustomerCredentialsFlow({
                        mode: "login",
                        name: "",
                        email: data.email,
                        password: data.password,
                        returnUrl: safeReturnUrl,
                      });

                      if (!flowResult.ok) {
                        setSubmitError(flowResult.error);
                        return;
                      }

                      resolveAuthenticatedAccess("credentials", customerAuth?.name ?? "", data.email);
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
                  {oauthError ? <p className="text-sm text-red-200">No se pudo iniciar sesión con Google.</p> : null}

                  <button
                    type="submit"
                    disabled={isPending || !isEmailAuthEnabled}
                    className={`${solidCtaClassName} mt-2 w-full disabled:pointer-events-none disabled:opacity-45`}
                  >
                    {isPending
                      ? mode === "register"
                        ? "Creando cuenta..."
                        : "Entrando..."
                      : mode === "register"
                        ? "Crear cuenta"
                        : "Iniciar sesión"}
                  </button>

                  {mode === "login" && isEmailAuthEnabled && (
                    <p className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-slate-400 transition hover:text-white"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </p>
                  )}

                  <p className="text-center text-sm text-slate-400">
                    {!isEmailAuthEnabled
                      ? "Falta una base de datos disponible para persistir cuentas customer. Mientras tanto, seguí con Google o como invitado."
                      : mode === "register"
                        ? "Creamos tu cuenta y te enviamos un email para verificarla antes de comprar."
                        : "Entrá con tu cuenta para continuar en un solo paso."}
                  </p>
                </form>
              </>
            )}

            {!showForgotPassword && (
              <>
                <div className="relative py-1 text-center text-xs tracking-[0.28em] uppercase text-slate-500">
                  <span className="relative z-10 bg-[rgba(7,9,14,0.99)] px-3">o seguí con</span>
                  <div className="absolute inset-x-0 top-1/2 z-0 border-t border-white/10" />
                </div>

                <div className="space-y-3">
                  {(isGoogleConnected || isGoogleAuthEnabled) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isGoogleConnected) {
                          resolveAuthenticatedAccess("google", customerAuth?.name ?? "", customerAuth?.email ?? "");
                          return;
                        }

                        startGoogleCustomerSignIn();
                      }}
                      className={`${ghostCtaClassName} w-full gap-3`}
                    >
                      <GoogleMark />
                      <span>{isGoogleConnected ? "Continuar con esta cuenta de Google" : "Continuar con Google"}</span>
                    </button>
                  ) : null}

                  {isGoogleConnected ? (
                    <button
                      type="button"
                      onClick={() => {
                        void signOut({ callbackUrl: "/login" });
                      }}
                      className={`${compactGhostCtaClassName} w-full justify-center`}
                    >
                      Desconectar Google
                    </button>
                  ) : (
                    <p className="text-center text-sm text-slate-400">
                      {isGoogleAuthEnabled
                        ? "Google inicia sesión y vuelve con tu cuenta customer automáticamente."
                        : "Google no está disponible en este entorno por ahora."}
                    </p>
                  )}
                </div>

                <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 text-center">
                  <p className="text-sm text-slate-300">¿Preferís resolverlo después?</p>
                  <button type="button" onClick={resolveGuestAccess} className={`${compactGhostCtaClassName} w-full justify-center`}>
                    Seguir como invitado
                  </button>
                  <Link href="/catalogo" className="block text-sm text-slate-400 transition hover:text-white">
                    Volver al catálogo
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
