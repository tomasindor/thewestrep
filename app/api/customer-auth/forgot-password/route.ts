import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDb } from "@/lib/db/core";
import { applyRateLimit } from "@/lib/security/with-rate-limit";
import { logger } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
});

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "forgot-password", { maxRequests: 3, windowMs: 5 * 60 * 1000 });
  if (rateLimit) return rateLimit;

  try {
    const db = requireDb();
    const body = forgotPasswordSchema.parse(await request.json());

    const { requestPasswordReset } = await import("@/lib/auth/customer-password-reset");
    await requestPasswordReset(body.email, db);

    // Always return 200 — don't reveal if email exists
    return NextResponse.json({
      message: "Si tu email está registrado, recibirás un link para resetear tu contraseña.",
    });
  } catch (error) {
    logger.error("forgot_password_request_failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
  }
}
