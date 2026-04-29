import type { NextAuthOptions } from "next-auth";

import { adminCredentialsProvider } from "@/lib/auth/admin";
import { getAuthSecret } from "@/lib/env";

const authProviders: NextAuthOptions["providers"] = [adminCredentialsProvider];

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret() ?? undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  cookies: {
    sessionToken: {
      name: "admin-session",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },
  providers: authProviders,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role === "admin") {
        token.role = "admin";
      }

      if (user?.id) {
        token.sub = user.id;
        token.customerId = user.id;
      }

      if (user?.email) {
        token.email = user.email;
      }

      if (user?.name) {
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = "admin";
        session.user.id = typeof token.customerId === "string" ? token.customerId : token.sub ?? "";
        session.user.email = token.email ?? session.user.email ?? null;
        session.user.name = token.name ?? session.user.name ?? null;
      }

      return session;
    },
  },
};
