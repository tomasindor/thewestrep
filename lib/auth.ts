import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getAdminCredentials, getAuthSecret } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret() ?? undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
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
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = "admin";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === "string" ? token.role : "admin";
      }

      return session;
    },
  },
};
