import "server-only";

import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { isPlaywrightRuntime } from "@/lib/testing/playwright-runtime";

async function isPlaywrightBypassEnabled() {
  try {
    const requestHeaders = await headers();

    return isPlaywrightRuntime({
      playwrightEnv: process.env.PLAYWRIGHT,
      requestHeader: requestHeaders.get("x-playwright-admin"),
    });
  } catch {
    return isPlaywrightRuntime({
      playwrightEnv: process.env.PLAYWRIGHT,
      requestHeader: null,
    });
  }
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  return session?.user?.role === "admin" ? session : null;
}

export async function getCustomerSession() {
  const session = await getServerSession(authOptions);

  return session?.user?.role === "customer" ? session : null;
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session?.user) {
    if (await isPlaywrightBypassEnabled()) {
      return {
        user: {
          id: "admin-playwright",
          role: "admin",
          name: "Playwright Admin",
          email: "admin@thewestrep.local",
        },
      };
    }

    redirect("/admin/login");
  }

  return session;
}
