import "server-only";

import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customer-auth-route-handlers";
import { resolveCustomerSession } from "@/lib/auth/customer-session-resolver";
import { revokeCustomerSession, validateCustomerSession } from "@/lib/auth/customer-session";
import { requireDb } from "@/lib/db/core";
import { customerAccounts } from "@/lib/db/schema";
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
  return resolveCustomerSession({
    getCookieToken: async () => {
      const cookieStore = await cookies();
      return cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value ?? null;
    },
    validateSession: (token) => validateCustomerSession(token),
    findAccountById: async (customerId) => {
      const db = requireDb();
      return (await db.query.customerAccounts.findFirst({ where: eq(customerAccounts.id, customerId) })) ?? null;
    },
    getNextAuthSession: async () => getServerSession(authOptions),
    revokeSession: (token) => revokeCustomerSession(token),
  });
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
