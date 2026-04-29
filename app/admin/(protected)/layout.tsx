import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/admin/logout-button";
import { hasCustomerSessionCookie, shouldBlockAdminLogin } from "@/lib/auth/admin-boundary";
import { getAdminSession, requireAdminSession } from "@/lib/auth/session";
import { eyebrowAccentClassName, navLinkClassName } from "@/lib/ui";

const adminNavItems = [
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/imports", label: "Importaciones" },
  { href: "/admin/brands", label: "Marcas" },
  { href: "/admin/categories", label: "Categorías" },
];

export default async function AdminProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [adminSession, cookieStore] = await Promise.all([getAdminSession(), cookies()]);
  const hasCustomerSession = hasCustomerSessionCookie(cookieStore.toString());

  if (shouldBlockAdminLogin({ hasAdminSession: Boolean(adminSession?.user), hasCustomerSession })) {
    redirect("/admin/login?error=customer-session");
  }

  await requireAdminSession();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="space-y-1">
            <p className={eyebrowAccentClassName}>thewestrep admin</p>
            <p className="text-sm text-slate-300">Backend V1 privado dentro del mismo sitio.</p>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {adminNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClassName}>
                {item.label}
              </Link>
            ))}
          </nav>

          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
