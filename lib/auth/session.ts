import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

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
    redirect("/admin/login");
  }

  return session;
}
