export interface CustomerCookieSession {
  user: {
    id: string;
    role: "customer";
    email: string;
    name: string;
    authProvider: "credentials";
    emailVerified: string | null;
  };
}

export interface ResolveCustomerSessionDeps {
  getCookieToken: () => Promise<string | null>;
  validateSession: (token: string) => Promise<{ customerId: string } | null>;
  findAccountById: (customerId: string) => Promise<{
    id: string;
    email: string;
    name: string;
    emailVerified: Date | null;
  } | null>;
  getNextAuthSession: () => Promise<{ user?: { role?: "admin" | "customer" } } | null>;
  revokeSession?: (token: string) => Promise<void>;
}

export async function resolveCustomerSession(deps: ResolveCustomerSessionDeps): Promise<CustomerCookieSession | null> {
  const token = await deps.getCookieToken();

  if (token) {
    const session = await deps.validateSession(token);

    if (session?.customerId) {
      const account = await deps.findAccountById(session.customerId);

      if (account) {
        return {
          user: {
            id: account.id,
            role: "customer",
            email: account.email,
            name: account.name,
            authProvider: "credentials",
            emailVerified: account.emailVerified?.toISOString() ?? null,
          },
        };
      }
    }

    await deps.revokeSession?.(token);
  }

  const legacySession = await deps.getNextAuthSession();

  if (legacySession?.user?.role === "admin") {
    return null;
  }

  return null;
}
