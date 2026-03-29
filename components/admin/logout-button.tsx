"use client";

import { signOut } from "next-auth/react";

import { compactGhostCtaClassName } from "@/lib/ui";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className={compactGhostCtaClassName}
    >
      Salir
    </button>
  );
}
