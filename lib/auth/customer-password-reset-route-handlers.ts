import "server-only";

import { z } from "zod";

import { customerPasswordSchema, normalizeCustomerEmail } from "@/lib/auth/customer-credentials";
import { requestPasswordReset, resetPassword } from "@/lib/auth/customer-password-reset";
import { revokeAllCustomerSessions } from "@/lib/auth/customer-session";
import { requireDb } from "@/lib/db/core";
import { logger } from "@/lib/logger";
import { DbRateLimiter } from "@/lib/security/db-rate-limiter";
import { extractClientIp } from "@/lib/security/with-rate-limit";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token requerido."),
  newPassword: customerPasswordSchema,
});

interface CustomerForgotPasswordRouteDeps {
  consumeRateLimit: (request: Request) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  requestPasswordReset: (email: string) => Promise<void>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

interface CustomerResetPasswordRouteDeps {
  consumeRateLimit: (request: Request) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string; customerId?: string }>;
  revokeAllCustomerSessions: (customerId: string) => Promise<void>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

export function createCustomerForgotPasswordRouteHandler(overrides: Partial<CustomerForgotPasswordRouteDeps> = {}) {
  const deps: CustomerForgotPasswordRouteDeps = {
    consumeRateLimit: async (request) => {
      try {
        const limiter = new DbRateLimiter();
        const ip = extractClientIp(request);
        const result = await limiter.consume(`customer-forgot-password:${ip}`, {
          maxPoints: 3,
          windowMs: 5 * 60 * 1000,
        });

        return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
      } catch {
        return { allowed: true, retryAfterSeconds: 0 };
      }
    },
    requestPasswordReset: async (email) => {
      const db = requireDb();
      await requestPasswordReset(email, db);
    },
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerForgotPassword(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento antes de volver a intentar." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    try {
      const body = forgotPasswordSchema.parse(await request.json());
      await deps.requestPasswordReset(normalizeCustomerEmail(body.email));

      return Response.json({
        message: "Si tu email está registrado, recibirás un link para resetear tu contraseña.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ error: "Ingresá un email válido." }, { status: 400 });
      }

      deps.logError("customer_forgot_password_failed", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
    }
  };
}

export function createCustomerResetPasswordRouteHandler(overrides: Partial<CustomerResetPasswordRouteDeps> = {}) {
  const deps: CustomerResetPasswordRouteDeps = {
    consumeRateLimit: async (request) => {
      try {
        const limiter = new DbRateLimiter();
        const ip = extractClientIp(request);
        const result = await limiter.consume(`customer-reset-password:${ip}`, {
          maxPoints: 5,
          windowMs: 5 * 60 * 1000,
        });

        return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
      } catch {
        return { allowed: true, retryAfterSeconds: 0 };
      }
    },
    resetPassword: async (token, newPassword) => {
      const db = requireDb();
      return resetPassword(token, newPassword, db);
    },
    revokeAllCustomerSessions: (customerId) => revokeAllCustomerSessions(customerId),
    logError: logger.error,
    ...overrides,
  };

  return async function handleCustomerResetPassword(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Demasiados intentos. Esperá un momento antes de volver a intentar." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    try {
      const body = resetPasswordSchema.parse(await request.json());
      const result = await deps.resetPassword(body.token, body.newPassword);

      if (!result.success) {
        return Response.json({ error: result.error ?? "No se pudo resetear la contraseña." }, { status: 400 });
      }

      if (result.customerId) {
        await deps.revokeAllCustomerSessions(result.customerId);
      }

      return Response.json({ message: "Contraseña actualizada correctamente." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ error: error.issues[0]?.message ?? "Revisá los datos del formulario." }, { status: 400 });
      }

      deps.logError("customer_reset_password_failed", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
    }
  };
}
