import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Resetear contraseña",
  description: "Creá una nueva contraseña para tu cuenta de TheWestRep.",
  path: "/reset-password",
});

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 sm:py-16">
        <ResetPasswordForm token={token} />
      </main>
    </div>
  );
}
