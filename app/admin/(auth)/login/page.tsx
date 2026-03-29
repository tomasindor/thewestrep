import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session?.user) {
    redirect("/admin/products");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
        <div className="mb-8 space-y-3">
          <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">Admin privado</p>
          <h1 className="font-display text-4xl text-white">Entrá al backend de thewestrep</h1>
          <p className="text-sm leading-6 text-slate-300">
            Un solo usuario admin, sesión privada dentro del mismo sitio y WhatsApp como CTA pública.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
