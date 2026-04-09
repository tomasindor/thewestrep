import type { NextAuthOptions } from "next-auth";

import { adminCredentialsProvider } from "@/lib/auth/admin";
import { upsertCustomerGoogleAccount } from "@/lib/auth/customer-accounts";
import { getCustomerCredentialsProvider, getCustomerGoogleProvider } from "@/lib/auth/customer";
import { getAuthSecret } from "@/lib/env";

const customerCredentialsProvider = getCustomerCredentialsProvider();
const customerGoogleProvider = getCustomerGoogleProvider();
const authProviders: NextAuthOptions["providers"] = [adminCredentialsProvider];

if (customerCredentialsProvider) {
  authProviders.push(customerCredentialsProvider);
}

if (customerGoogleProvider) {
  authProviders.push(customerGoogleProvider);
}

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
      name: `next-auth.session-token`,
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
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && user?.role === "customer" && user.email && profile?.sub) {
        const persistedCustomer = await upsertCustomerGoogleAccount({
          email: user.email,
          name: user.name ?? "",
          googleSubject: profile.sub,
        });

        token.customerId = persistedCustomer.id;
        token.authProvider = "google";
        token.email = persistedCustomer.email;
        token.name = persistedCustomer.name;
        token.sub = persistedCustomer.id;
      }

      if (user?.role) {
        token.role = user.role;
      }

      if (user?.id) {
        token.customerId = user.id;
        token.sub = user.id;
      }

      if (user?.email) {
        token.email = user.email;
      }

      if (user?.name) {
        token.name = user.name;
      }

      if (user?.authProvider) {
        token.authProvider = user.authProvider;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role === "admin" || token.role === "customer" ? token.role : "customer";
        session.user.id = typeof token.customerId === "string" ? token.customerId : token.sub ?? "";
        session.user.authProvider = token.authProvider === "google" || token.authProvider === "credentials" ? token.authProvider : undefined;
        session.user.email = token.email ?? session.user.email ?? null;
        session.user.name = token.name ?? session.user.name ?? null;
      }

      return session;
    },
  },
};
