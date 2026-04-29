import { redirect } from "next/navigation";

import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";

interface RegisterPageProps {
  searchParams: Promise<{
    returnUrl?: string | string[];
  }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolved = await searchParams;
  const rawReturnUrl = Array.isArray(resolved.returnUrl) ? resolved.returnUrl[0] : resolved.returnUrl;
  const returnUrl = sanitizeAuthReturnUrl(rawReturnUrl, "/");

  redirect(`/login?mode=register&returnUrl=${encodeURIComponent(returnUrl)}`);
}
