import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDb } from "@/lib/db/core";
import { applyRateLimit } from "@/lib/security/with-rate-limit";
import { customerPasswordSchema } from "@/lib/auth/customer-credentials";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido."),
  newPassword: customerPasswordSchema,
});

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "reset-password", { maxRequests: 5, windowMs: 5 * 60 * 1000 });
  if (rateLimit) return rateLimit;

  try {
    const db = requireDb();
    const body = resetPasswordSchema.parse(await request.json());

    const { resetPassword } = await import("@/lib/auth/customer-password-reset");
    const result = await resetPassword(body.token, body.newPassword, db);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    logger.error("reset_password_request_failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
  }
}
