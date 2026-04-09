import CredentialsProvider from "next-auth/providers/credentials";

import { getAdminCredentials } from "@/lib/env";

export const adminCredentialsProvider = CredentialsProvider({
  id: "admin-credentials",
  name: "Admin",
  credentials: {
    username: { label: "Usuario", type: "text" },
    password: { label: "Contraseña", type: "password" },
  },
  async authorize(credentials) {
    const adminCredentials = getAdminCredentials();

    if (!adminCredentials.username || !adminCredentials.password) {
      throw new Error("Missing ADMIN_USERNAME or ADMIN_PASSWORD environment variables.");
    }

    if (
      credentials?.username?.trim() === adminCredentials.username &&
      credentials.password === adminCredentials.password
    ) {
      return {
        id: "admin",
        name: "Admin",
        email: "admin@thewestrep.local",
        role: "admin" as const,
      };
    }

    return null;
  },
});
