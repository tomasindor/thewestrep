"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { inputClassName, solidCtaClassName } from "@/lib/ui";

interface StrengthCheck {
  label: string;
  met: boolean;
}

function getPasswordStrength(password: string): { checks: StrengthCheck[]; score: number } {
  const checks: StrengthCheck[] = [
    { label: "Al menos 8 caracteres", met: password.length >= 8 },
    { label: "Al menos una letra", met: /[A-Za-z]/.test(password) },
    { label: "Al menos un número", met: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  return { checks, score };
}

function StrengthIndicator({ password }: { password: string }) {
  const { checks, score } = getPasswordStrength(password);

  const barColor =
    score === 0
      ? "bg-white/10"
      : score === 1
        ? "bg-red-400"
        : score === 2
          ? "bg-yellow-400"
          : "bg-green-400";

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${(score / checks.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-1 text-xs text-slate-400">
        {checks.map((check) => (
          <li key={check.label} className={check.met ? "text-green-300" : ""}>
            {check.met ? "✓" : "○"} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white sm:text-[2rem]">Token no válido</h1>
            <p className="text-sm leading-6 text-slate-400">
              El link de reseteo no contiene un token. Solicitá uno nuevo desde el login.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/login" className={`${solidCtaClassName} w-full block text-center`}>
              Volver al login
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-white sm:text-[2rem]">¡Contraseña actualizada!</h1>
            <p className="text-sm leading-6 text-slate-400">
              Tu contraseña fue cambiada exitosamente. Ya podés iniciar sesión.
            </p>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={`${solidCtaClassName} w-full`}
            >
              Ir al login
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/customer/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        });

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;

        if (!response.ok) {
          const apiError = payload?.error ?? "No se pudo resetear la contraseña. Intentá de nuevo.";
          if (apiError.toLowerCase().includes("expir")) {
            setError("El link ha expirado. Solicitá uno nuevo.");
          } else {
            setError(apiError);
          }
          return;
        }

        setSuccess(true);
      } catch {
        setError("Ocurrió un error inesperado. Intentá de nuevo.");
      }
    });
  };

  return (
    <div className="w-full max-w-md">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white sm:text-[2rem]">Resetear contraseña</h1>
          <p className="text-sm leading-6 text-slate-400">
            Elegí una nueva contraseña para tu cuenta.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-white">Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={inputClassName}
            />
            {password.length > 0 && <StrengthIndicator password={password} />}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-white">Confirmar contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Repetí tu contraseña"
              className={`${inputClassName} ${
                confirmPassword.length > 0 && password !== confirmPassword
                  ? "border-red-300/60"
                  : ""
              }`}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-sm text-red-200">Las contraseñas no coinciden.</p>
            )}
          </label>

          {error && <p className="text-sm text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className={`${solidCtaClassName} w-full disabled:pointer-events-none disabled:opacity-45`}
          >
            {isPending ? "Guardando..." : "Guardar nueva contraseña"}
          </button>

          <p className="text-center text-xs text-slate-500">
            ¿No solicitaste este cambio?{" "}
            <Link href="/login" className="text-slate-400 transition hover:text-white">
              Volvé al login
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
