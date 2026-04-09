"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { solidCtaClassName } from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await signIn("admin-credentials", {
            username: String(formData.get("username") ?? ""),
            password: String(formData.get("password") ?? ""),
            redirect: false,
            callbackUrl: "/admin/products",
          });

          if (result?.error) {
            setError("Credenciales inválidas.");
            return;
          }

          router.push(result?.url ?? "/admin/products");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-white">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[rgba(210,138,163,0.5)] focus:ring-2 focus:ring-[rgba(210,138,163,0.24)]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-white">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-[rgba(210,138,163,0.5)] focus:ring-2 focus:ring-[rgba(210,138,163,0.24)]"
        />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={isPending} className={`${solidCtaClassName} w-full disabled:opacity-70`}>
        {isPending ? "Entrando..." : "Entrar al admin"}
      </button>
    </form>
  );
}
