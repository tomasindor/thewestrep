import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { LoginForm } from "@/components/admin/login-form";
import { hasCustomerSessionCookie, shouldBlockAdminLogin } from "@/lib/auth/admin-boundary";
import { getAdminSession } from "@/lib/auth/session";
import { compactGhostCtaClassName, ghostCtaClassName } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const [session, cookieStore] = await Promise.all([getAdminSession(), cookies()]);
  const hasCustomerSession = hasCustomerSessionCookie(cookieStore.toString());

  if (session?.user) {
    redirect("/admin/products");
  }

  const isBlockedByCustomerSession = shouldBlockAdminLogin({
    hasAdminSession: Boolean(session?.user),
    hasCustomerSession,
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
        <div className="mb-8 space-y-3">
          <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Admin privado</p>
          <h1 className="font-display text-4xl text-white">Entrá al backend de thewestrep</h1>
          <p className="text-sm leading-6 text-slate-300">
            Un solo usuario admin, sesión privada dentro del mismo sitio y WhatsApp como CTA pública.
          </p>
        </div>

        {isBlockedByCustomerSession ? (
          <div className="space-y-4 rounded-[1.1rem] border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold text-amber-50">Sesión customer detectada</p>
            <p>
              Para mantener la separación admin/customer, primero cerrá la sesión customer y recién ahí iniciá sesión
              admin.
            </p>
            <form action="/api/customer/logout?returnUrl=/admin/login" method="post">
              <button type="submit" className={ghostCtaClassName}>
                Cerrar sesión customer
              </button>
            </form>
            <a href="/login" className={compactGhostCtaClassName}>
              Ir al login de clientes
            </a>
          </div>
        ) : (
          <LoginForm />
        )}
      </section>
    </main>
  );
}
