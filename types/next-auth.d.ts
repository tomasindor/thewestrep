import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "admin" | "customer";
      authProvider?: "credentials" | "google";
      emailVerified?: string | null;
    };
  }

  interface User {
    id?: string;
    role?: "admin" | "customer";
    authProvider?: "credentials" | "google";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    customerId?: string;
    role?: "admin" | "customer";
    authProvider?: "credentials" | "google";
  }
}
