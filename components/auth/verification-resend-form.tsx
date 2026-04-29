"use client";

import { useState } from "react";

import { compactGhostCtaClassName, inputClassName, solidCtaClassName } from "@/lib/ui";

interface VerificationResendFormProps {
  returnUrl: string;
  defaultEmail?: string;
}

export function VerificationResendForm({ returnUrl, defaultEmail }: VerificationResendFormProps) {
  const knownEmail = (defaultEmail ?? "").trim();
  const hasKnownEmail = knownEmail.length > 0;
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualEmailForm, setShowManualEmailForm] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setIsPending(true);

        try {
          const targetEmail = hasKnownEmail ? knownEmail : email;
          const response = await fetch("/api/customer/resend-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail, returnUrl }),
          });

          const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

          if (!response.ok) {
            setError(payload?.error ?? "No pudimos reenviar el email ahora.");
            return;
          }

          setMessage(payload?.message ?? "Si el email está registrado, te enviamos un nuevo link de verificación.");
        } catch {
          setError("No pudimos reenviar el email ahora.");
        } finally {
          setIsPending(false);
        }
      }}
    >
      {hasKnownEmail ? (
        <p className="text-sm text-slate-300">
          Te lo enviamos a <span className="font-semibold text-white">{knownEmail}</span>.
        </p>
      ) : null}

      {!hasKnownEmail && showManualEmailForm ? (
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="nombre@correo.com"
            className={inputClassName}
            required
          />
        </label>
      ) : null}

      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {hasKnownEmail || showManualEmailForm ? (
          <button type="submit" disabled={isPending} className={`${solidCtaClassName} flex-1 disabled:opacity-45`}>
            {isPending ? "Reenviando..." : "Reenviar email de verificación"}
          </button>
        ) : null}
        <a href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} className={`${compactGhostCtaClassName} flex-1 justify-center`}>
          Volver al login
        </a>
      </div>

      {!hasKnownEmail && !showManualEmailForm ? (
        <p className="text-center">
          <button
            type="button"
            onClick={() => setShowManualEmailForm(true)}
            className="text-xs text-slate-400 underline-offset-2 transition hover:text-white hover:underline"
          >
            No veo el email. Ingresarlo manualmente
          </button>
        </p>
      ) : null}
    </form>
  );
}
