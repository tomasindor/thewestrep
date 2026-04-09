import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { customerAccounts } from "@/lib/db/schema";
import { hashCustomerPassword } from "@/lib/auth/customer-password";
import type { getDb } from "@/lib/db/core";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

type Db = NonNullable<ReturnType<typeof getDb>>;

export function generateResetToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString("hex");
}

export async function requestPasswordReset(
  email: string,
  db: Db,
): Promise<void> {
  const account = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.email, email.toLowerCase()),
  });

  if (!account || !account.passwordHash) {
    return; // Don't reveal if email exists or has no password
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.update(customerAccounts)
    .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
    .where(eq(customerAccounts.id, account.id));

  // Send email (non-blocking, don't fail if email service is down)
  try {
    const { sendPasswordResetEmail } = await import("@/lib/email/resend");
    await sendPasswordResetEmail(email, token);
  } catch (error) {
    console.warn("Failed to send password reset email:", error);
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
  db: Db,
): Promise<{ success: boolean; error?: string }> {
  const account = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.passwordResetToken, token),
  });

  if (!account) {
    return { success: false, error: "Token inválido." };
  }

  if (!account.passwordResetExpiresAt || account.passwordResetExpiresAt < new Date()) {
    return { success: false, error: "El token expiró. Solicitá un nuevo reset." };
  }

  const hashedPassword = await hashCustomerPassword(newPassword);

  await db.update(customerAccounts)
    .set({
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(customerAccounts.id, account.id));

  return { success: true };
}
