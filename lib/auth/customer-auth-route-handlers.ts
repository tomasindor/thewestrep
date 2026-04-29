import "server-only";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  CustomerAccountExistsError,
  CustomerGoogleAccountExistsError,
  authenticateCustomerEmailPassword,
  registerCustomerEmailPasswordAccount,
} from "@/lib/auth/customer-accounts";
import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";
import {
  customerPasswordSchema,
  normalizeCustomerEmail,
} from "@/lib/auth/customer-credentials";
import { createCustomerSession, revokeCustomerSession, validateCustomerSession } from "@/lib/auth/customer-session";
import { requireDb } from "@/lib/db/core";
import { customerAccounts } from "@/lib/db/schema";
import { sendVerificationEmail } from "@/lib/email/resend";
import { logger } from "@/lib/logger";
import { DbRateLimiter } from "@/lib/security/db-rate-limiter";
import { extractClientIp } from "@/lib/security/with-rate-limit";

export const CUSTOMER_SESSION_COOKIE = "customer_session";
const CUSTOMER_LOGIN_RATE_LIMITER_KEY = "customer-login";
const CUSTOMER_REGISTER_RATE_LIMITER_KEY = "customer-register";
const CUSTOMER_VERIFY_RATE_LIMITER_KEY = "customer-verify";
const CUSTOMER_RESEND_RATE_LIMITER_KEY = "customer-resend-verification";
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const loginPayloadSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
  returnUrl: z.string().optional(),
});

const registerPayloadSchema = z.object({
  name: z.string().trim().min(2, "Decinos al menos tu nombre.").max(120, "Usá un nombre más corto."),
  email: z.string().trim().email("Ingresá un email válido."),
  password: customerPasswordSchema,
  returnUrl: z.string().optional(),
});

const resendVerificationPayloadSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  returnUrl: z.string().optional(),
});

export function sanitizeReturnUrl(value: string | null | undefined, fallback = "/") {
  return sanitizeAuthReturnUrl(value, fallback);
}

interface CustomerLoginRouteDeps {
  consumeRateLimit: (request: Request) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  authenticate: (payload: { email: string; password: string }) => Promise<{ id: string; email: string; name: string } | null>;
  createSession: (customerId: string) => Promise<{ token: string; expiresAt: Date }>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

interface CustomerLogoutRouteDeps {
  revokeSession: (token: string) => Promise<void>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

interface CustomerSessionRouteDeps {
  validateSession: (token: string) => Promise<{ customerId: string; token: string; expiresAt: Date } | null>;
  findAccountById: (customerId: string) => Promise<{
    id: string;
    email: string;
    name: string;
    emailVerified: Date | null;
  } | null>;
  revokeSession: (token: string) => Promise<void>;
}

interface CustomerRegisterRouteDeps {
  consumeRateLimit: (request: Request) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  now: () => Date;
  createVerificationToken: () => string;
  registerAccount: (payload: {
    name: string;
    email: string;
    password: string;
    verificationToken: string;
    verificationTokenExpiresAt: Date;
  }) => Promise<{ id: string; email: string; name: string }>;
  sendVerificationEmail: (payload: { to: string; token: string; returnUrl: string }) => Promise<void>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

interface CustomerVerifyRouteDeps {
  consumeRateLimit: (request: Request) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  consumeVerificationToken: (token: string) => Promise<{ customerId: string; returnUrl: string } | null>;
  markEmailVerified: (customerId: string, now: Date) => Promise<void>;
  createSession: (customerId: string) => Promise<{ token: string; expiresAt: Date }>;
  now: () => Date;
  logError: (event: string, context: Record<string, unknown>) => void;
}

function buildVerifyEmailPendingRedirect(returnUrl: string, email: string) {
  const params = new URLSearchParams({ returnUrl, email });
  return `/verify-email?${params.toString()}`;
}

interface CustomerResendVerificationRouteDeps {
  consumeRateLimit: (request: Request) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  now: () => Date;
  createVerificationToken: () => string;
  findPendingAccountByEmail: (email: string) => Promise<{ id: string; email: string } | null>;
  updateVerificationToken: (payload: { customerId: string; verificationToken: string; verificationTokenExpiresAt: Date }) => Promise<void>;
  sendVerificationEmail: (payload: { to: string; token: string; returnUrl: string }) => Promise<void>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

function formatCookie(value: string, expiresAt: Date) {
  const flags = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (process.env.NODE_ENV === "production") {
    flags.push("Secure");
  }

  return flags.join("; ");
}

function createRedirectResponse(request: Request, redirectTo: string, setCookie: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(redirectTo, request.url).toString(),
      "Set-Cookie": setCookie,
    },
  });
}

function createRedirectOnlyResponse(request: Request, redirectTo: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(redirectTo, request.url).toString(),
    },
  });
}

function getCookieTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookiePrefix = `${CUSTOMER_SESSION_COOKIE}=`;

  for (const chunk of cookieHeader.split(";")) {
    const cookie = chunk.trim();

    if (cookie.startsWith(cookiePrefix)) {
      return decodeURIComponent(cookie.slice(cookiePrefix.length));
    }
  }

  return null;
}

function createVerificationToken() {
  return randomBytes(32).toString("hex");
}

export function createCustomerLoginRouteHandler(overrides: Partial<CustomerLoginRouteDeps> = {}) {
  const deps: CustomerLoginRouteDeps = {
    consumeRateLimit: async (request) => {
      try {
        const limiter = new DbRateLimiter();
        const ip = extractClientIp(request);
        const result = await limiter.consume(`${CUSTOMER_LOGIN_RATE_LIMITER_KEY}:${ip}`, {
          maxPoints: 5,
          windowMs: 15 * 60 * 1000,
        });

        return {
          allowed: result.allowed,
          retryAfterSeconds: result.retryAfterSeconds,
        };
      } catch {
        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }
    },
    authenticate: authenticateCustomerEmailPassword,
    createSession: (customerId) => createCustomerSession(customerId),
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerLogin(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);

    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento antes de volver a intentar." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    try {
      const payload = loginPayloadSchema.parse(await request.json());
      const customer = await deps.authenticate({ email: payload.email, password: payload.password });

      if (!customer) {
        return Response.json(
          { error: "Email o contraseña inválidos." },
          { status: 401 },
        );
      }

      const session = await deps.createSession(customer.id);
      const redirectTo = sanitizeReturnUrl(payload.returnUrl, "/");

      return createRedirectResponse(request, redirectTo, formatCookie(session.token, session.expiresAt));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ error: "Revisá los datos antes de continuar." }, { status: 400 });
      }

      deps.logError("customer_login_failed", { error: error instanceof Error ? error.message : String(error) });

      return Response.json({ error: "No pudimos iniciar sesión en este momento." }, { status: 500 });
    }
  };
}

export function createCustomerLogoutRouteHandler(overrides: Partial<CustomerLogoutRouteDeps> = {}) {
  const deps: CustomerLogoutRouteDeps = {
    revokeSession: (token) => revokeCustomerSession(token),
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerLogout(request: Request) {
    try {
      const token = getCookieTokenFromRequest(request);

      if (token) {
        await deps.revokeSession(token);
      }

      const requestUrl = new URL(request.url);
      const redirectTo = sanitizeReturnUrl(requestUrl.searchParams.get("returnUrl"), "/login");

      return createRedirectResponse(request, redirectTo, formatCookie("", new Date(0)));
    } catch (error) {
      deps.logError("customer_logout_failed", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: "No pudimos cerrar tu sesión ahora." }, { status: 500 });
    }
  };
}

export function createCustomerSessionRouteHandler(overrides: Partial<CustomerSessionRouteDeps> = {}) {
  const deps: CustomerSessionRouteDeps = {
    validateSession: (token) => validateCustomerSession(token),
    findAccountById: async (customerId) => {
      const db = requireDb();
      return (await db.query.customerAccounts.findFirst({ where: eq(customerAccounts.id, customerId) })) ?? null;
    },
    revokeSession: (token) => revokeCustomerSession(token),
    ...overrides,
  };

  return async function handleCustomerSession(request: Request) {
    const token = getCookieTokenFromRequest(request);

    if (!token) {
      return Response.json({ error: "No hay sesión activa." }, { status: 401 });
    }

    const validated = await deps.validateSession(token);

    if (!validated) {
      return Response.json({ error: "No hay sesión activa." }, { status: 401 });
    }

    const account = await deps.findAccountById(validated.customerId);

    if (!account) {
      await deps.revokeSession(token);
      return Response.json({ error: "No hay sesión activa." }, { status: 401 });
    }

    return Response.json({
      session: {
        user: {
          id: account.id,
          role: "customer",
          email: account.email,
          name: account.name,
          authProvider: "credentials",
          emailVerified: account.emailVerified?.toISOString() ?? null,
        },
      },
    });
  };
}

export function createCustomerRegisterRouteHandler(overrides: Partial<CustomerRegisterRouteDeps> = {}) {
  const deps: CustomerRegisterRouteDeps = {
    consumeRateLimit: async (request) => {
      try {
        const limiter = new DbRateLimiter();
        const ip = extractClientIp(request);
        const result = await limiter.consume(`${CUSTOMER_REGISTER_RATE_LIMITER_KEY}:${ip}`, {
          maxPoints: 3,
          windowMs: 15 * 60 * 1000,
        });

        return {
          allowed: result.allowed,
          retryAfterSeconds: result.retryAfterSeconds,
        };
      } catch {
        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }
    },
    now: () => new Date(),
    createVerificationToken,
    registerAccount: (payload) =>
      registerCustomerEmailPasswordAccount({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        verificationToken: payload.verificationToken,
        verificationTokenExpiresAt: payload.verificationTokenExpiresAt,
      }),
    sendVerificationEmail: ({ to, token, returnUrl }) => sendVerificationEmail(to, token, returnUrl),
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerRegister(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);

    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento antes de volver a intentar." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    try {
      const payload = registerPayloadSchema.parse(await request.json());
      const safeReturnUrl = sanitizeReturnUrl(payload.returnUrl, "/");
      const verificationToken = deps.createVerificationToken();
      const verificationTokenExpiresAt = new Date(deps.now().getTime() + VERIFICATION_TOKEN_TTL_MS);

      try {
        await deps.registerAccount({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          verificationToken,
          verificationTokenExpiresAt,
        });
      } catch (error) {
        if (error instanceof CustomerGoogleAccountExistsError) {
          return Response.json(
            {
              error: "Ese email ya está asociado a Google. Iniciá sesión con Google para continuar.",
              code: "google_account_exists",
            },
            { status: 409 },
          );
        }

        if (error instanceof CustomerAccountExistsError) {
          return Response.json(
            {
              error: "Ya existe una cuenta para ese email. Iniciá sesión o recuperá tu contraseña.",
              code: "duplicate_email",
            },
            { status: 409 },
          );
        }

        throw error;
      }

      try {
        await deps.sendVerificationEmail({
          to: payload.email,
          token: verificationToken,
          returnUrl: safeReturnUrl,
        });
      } catch (error) {
        deps.logError("customer_register_verification_email_failed", {
          error: error instanceof Error ? error.message : String(error),
          email: payload.email,
        });

        return Response.json(
          {
            verificationPending: true,
            redirectTo: buildVerifyEmailPendingRedirect(safeReturnUrl, payload.email),
            warning: {
              code: "email_delivery_failed",
              message: "No pudimos enviar el email de verificación ahora. Podés reenviarlo desde la próxima pantalla.",
            },
          },
          { status: 202 },
        );
      }

      return Response.json(
        {
          verificationPending: true,
          redirectTo: buildVerifyEmailPendingRedirect(safeReturnUrl, payload.email),
        },
        { status: 202 },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const passwordIssue = error.issues.find((issue) => issue.path.join(".").toLowerCase() === "password");

        if (passwordIssue?.message) {
          return Response.json({ error: passwordIssue.message }, { status: 400 });
        }

        return Response.json({ error: "Revisá los datos de la cuenta antes de seguir." }, { status: 400 });
      }

      deps.logError("customer_register_failed", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: "No pudimos crear tu cuenta en este momento." }, { status: 500 });
    }
  };
}

export function createCustomerVerifyRouteHandler(overrides: Partial<CustomerVerifyRouteDeps> = {}) {
  const deps: CustomerVerifyRouteDeps = {
    consumeRateLimit: async (request) => {
      try {
        const limiter = new DbRateLimiter();
        const ip = extractClientIp(request);
        const result = await limiter.consume(`${CUSTOMER_VERIFY_RATE_LIMITER_KEY}:${ip}`, {
          maxPoints: 5,
          windowMs: 15 * 60 * 1000,
        });

        return {
          allowed: result.allowed,
          retryAfterSeconds: result.retryAfterSeconds,
        };
      } catch {
        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }
    },
    consumeVerificationToken: async (token) => {
      const db = requireDb();
      const account = await db.query.customerAccounts.findFirst({
        where: eq(customerAccounts.verificationToken, token),
      });

      if (!account || !account.verificationTokenExpiresAt || account.verificationTokenExpiresAt <= new Date()) {
        return null;
      }

      return {
        customerId: account.id,
        returnUrl: "/",
      };
    },
    markEmailVerified: async (customerId, now) => {
      const db = requireDb();
      await db
        .update(customerAccounts)
        .set({
          emailVerified: now,
          verificationToken: null,
          verificationTokenExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(customerAccounts.id, customerId));
    },
    now: () => new Date(),
    createSession: (customerId) => createCustomerSession(customerId),
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerVerify(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);
    const requestUrl = new URL(request.url);
    const safeReturnUrl = sanitizeReturnUrl(requestUrl.searchParams.get("returnUrl"), "/");

    if (!rateLimit.allowed) {
      return createRedirectOnlyResponse(
        request,
        `/verify-email?status=rate-limited&returnUrl=${encodeURIComponent(safeReturnUrl)}`,
      );
    }

    const token = requestUrl.searchParams.get("token");

    if (!token) {
      return createRedirectOnlyResponse(request, `/verify-email?status=invalid&returnUrl=${encodeURIComponent(safeReturnUrl)}`);
    }

    try {
      const consumed = await deps.consumeVerificationToken(token);

      if (!consumed) {
        return createRedirectOnlyResponse(request, `/verify-email?status=invalid&returnUrl=${encodeURIComponent(safeReturnUrl)}`);
      }

      await deps.markEmailVerified(consumed.customerId, deps.now());
      const session = await deps.createSession(consumed.customerId);

      return createRedirectResponse(
        request,
        safeReturnUrl,
        formatCookie(session.token, session.expiresAt),
      );
    } catch (error) {
      deps.logError("customer_verify_failed", { error: error instanceof Error ? error.message : String(error) });
      return createRedirectOnlyResponse(request, `/verify-email?status=error&returnUrl=${encodeURIComponent(safeReturnUrl)}`);
    }
  };
}

export function createCustomerResendVerificationRouteHandler(
  overrides: Partial<CustomerResendVerificationRouteDeps> = {},
) {
  const deps: CustomerResendVerificationRouteDeps = {
    consumeRateLimit: async (request) => {
      try {
        const limiter = new DbRateLimiter();
        const ip = extractClientIp(request);
        const result = await limiter.consume(`${CUSTOMER_RESEND_RATE_LIMITER_KEY}:${ip}`, {
          maxPoints: 2,
          windowMs: 30 * 60 * 1000,
        });

        return {
          allowed: result.allowed,
          retryAfterSeconds: result.retryAfterSeconds,
        };
      } catch {
        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }
    },
    now: () => new Date(),
    createVerificationToken,
    findPendingAccountByEmail: async (email) => {
      const db = requireDb();
      const account = await db.query.customerAccounts.findFirst({
        where: eq(customerAccounts.email, normalizeCustomerEmail(email)),
      });

      if (!account || account.emailVerified) {
        return null;
      }

      return {
        id: account.id,
        email: account.email,
      };
    },
    updateVerificationToken: async ({ customerId, verificationToken, verificationTokenExpiresAt }) => {
      const db = requireDb();
      await db
        .update(customerAccounts)
        .set({
          verificationToken,
          verificationTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(customerAccounts.id, customerId));
    },
    sendVerificationEmail: ({ to, token, returnUrl }) => sendVerificationEmail(to, token, returnUrl),
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerResendVerification(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);

    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento antes de volver a intentar." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    try {
      const payload = resendVerificationPayloadSchema.parse(await request.json());
      const safeReturnUrl = sanitizeReturnUrl(payload.returnUrl, "/");
      const account = await deps.findPendingAccountByEmail(payload.email);

      if (account) {
        const verificationToken = deps.createVerificationToken();
        const verificationTokenExpiresAt = new Date(deps.now().getTime() + VERIFICATION_TOKEN_TTL_MS);

        await deps.updateVerificationToken({
          customerId: account.id,
          verificationToken,
          verificationTokenExpiresAt,
        });

        await deps.sendVerificationEmail({
          to: account.email,
          token: verificationToken,
          returnUrl: safeReturnUrl,
        });
      }

      return Response.json({ message: "Si el email está registrado, te enviamos un nuevo link de verificación." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ error: "Ingresá un email válido." }, { status: 400 });
      }

      deps.logError("customer_resend_verification_failed", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: "No pudimos reenviar la verificación ahora." }, { status: 500 });
    }
  };
}
