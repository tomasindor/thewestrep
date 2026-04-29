import type { Metadata } from "next";

import { VerificationResendForm } from "@/components/auth/verification-resend-form";
import { resolveVerifyEmailPageState } from "@/lib/auth/verify-email-page-state";
import { createPageMetadata } from "@/lib/seo";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    returnUrl?: string | string[];
    status?: string | string[];
    email?: string | string[];
  }>;
}

export const metadata: Metadata = createPageMetadata({
  title: "Verificá tu email",
  description: "Confirmá tu email para habilitar tu cuenta customer y continuar con tu compra.",
  path: "/verify-email",
});

function resolveStatus(raw: string | undefined) {
  if (raw === "invalid") {
    return "El link de verificación es inválido o expiró. Pedí uno nuevo.";
  }

  if (raw === "rate-limited") {
    return "Llegaste al límite de intentos de verificación. Esperá un momento y volvé a intentar.";
  }

  if (raw === "error") {
    return "No pudimos procesar la verificación en este momento.";
  }

  return "Te enviamos un email de verificación. Confirmalo para habilitar tu cuenta.";
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolved = await searchParams;
  const rawStatus = Array.isArray(resolved.status) ? resolved.status[0] : resolved.status;
  const { returnUrl, defaultEmail } = resolveVerifyEmailPageState(resolved);
  const baseMessage = resolveStatus(rawStatus);
  const description = defaultEmail
    ? `${baseMessage} Revisá la casilla de ${defaultEmail}.`
    : `${baseMessage} Revisá tu casilla y también spam/promociones.`;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8 sm:py-10">
      <section className="w-full max-w-md space-y-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-6 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white sm:text-[2rem]">Verificá tu email</h1>
          <p className="text-sm leading-6 text-slate-300">{description}</p>
        </header>

        <VerificationResendForm returnUrl={returnUrl} defaultEmail={defaultEmail} />
      </section>
    </main>
  );
}
