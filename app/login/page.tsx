import type { Metadata } from "next";
import Link from "next/link";

import { CustomerLoginExperience } from "@/components/auth/customer-login-experience";
import { PublicHeader } from "@/components/layout/public-header";
import { getCustomerSession } from "@/lib/auth/session";
import { isCustomerGoogleAuthConfigured, isDatabaseConfigured } from "@/lib/env";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";
import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";

interface LoginPageProps {
  searchParams: Promise<{
    access?: string | string[];
    returnUrl?: string | string[];
    mode?: string | string[];
    error?: string | string[];
  }>;
}

export const metadata: Metadata = createPageMetadata({
  title: "Login",
  description:
    "Acceso customer de thewestrep para entrar con email, Google o invitado y continuar al checkout sin ruido.",
  path: "/login",
  keywords: ["login", "checkout", "cuenta customer", "invitado"],
});

const loginNavItems = [
  { href: "/catalogo", label: "Catálogos" },
  { href: "/stock", label: "Stock" },
  { href: "/encargue", label: "Encargue" },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const [customerSession, hasGoogleConfig, isEmailAuthEnabled] = await Promise.all([
    getCustomerSession(),
    Promise.resolve(isCustomerGoogleAuthConfigured()),
    Promise.resolve(isDatabaseConfigured()),
  ]);
  const isGoogleAuthEnabled = hasGoogleConfig;
  const requestedAccess = Array.isArray(resolvedSearchParams.access)
    ? resolvedSearchParams.access[0]
    : resolvedSearchParams.access;
  const requestedReturnUrl = Array.isArray(resolvedSearchParams.returnUrl)
    ? resolvedSearchParams.returnUrl[0]
    : resolvedSearchParams.returnUrl;
  const requestedMode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;
  const oauthError = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error;
  const returnUrl = sanitizeAuthReturnUrl(requestedReturnUrl, "/");
  const initialMode = requestedMode === "register" ? "register" : "login";

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeader
        navItems={loginNavItems}
        homeLinkLabel="Volver al inicio de thewestrep"
        actions={
          <Link href="/catalogo" className={compactGhostCtaClassName}>
            Seguir comprando
          </Link>
        }
      />

      <CustomerLoginExperience
        customerAuth={
          customerSession?.user
            ? {
                name: customerSession.user.name ?? "",
                email: customerSession.user.email ?? "",
                authProvider: customerSession.user.authProvider ?? "credentials",
              }
            : null
        }
        isEmailAuthEnabled={isEmailAuthEnabled}
        isGoogleAuthEnabled={isGoogleAuthEnabled}
        shouldAutoAdvanceGoogleAccess={requestedAccess === "google" && customerSession?.user?.role === "customer"}
        returnUrl={returnUrl}
        initialMode={initialMode}
        oauthError={oauthError}
      />
    </div>
  );
}
