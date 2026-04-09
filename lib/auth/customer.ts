import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { authenticateCustomerEmailPassword } from "@/lib/auth/customer-accounts";
import { customerLoginSchema } from "@/lib/auth/customer-credentials";
import { getCustomerGoogleCredentials } from "@/lib/env";
import { isDatabaseConfigured } from "@/lib/env/shared";

export function getCustomerCredentialsProvider() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return CredentialsProvider({
    id: "customer-credentials",
    name: "Customer",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      const parsed = customerLoginSchema.safeParse({
        email: credentials?.email ?? "",
        password: credentials?.password ?? "",
      });

      if (!parsed.success) {
        return null;
      }

      return authenticateCustomerEmailPassword(parsed.data);
    },
  });
}

export function getCustomerGoogleProvider() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const credentials = getCustomerGoogleCredentials();

  if (!credentials.clientId || !credentials.clientSecret) {
    return null;
  }

  return GoogleProvider({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
        role: "customer" as const,
        authProvider: "google" as const,
      };
    },
  });
}
