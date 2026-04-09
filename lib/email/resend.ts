import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@thewestrep.com",
    to,
    subject: "Reset de contraseña — TheWestRep",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #fff; background: #111; padding: 24px; margin: 0;">TheWestRep</h1>
        <div style="padding: 24px; background: #1a1a1a; color: #e0e0e0;">
          <p>Recibimos una solicitud para resetear tu contraseña.</p>
          <p><a href="${resetUrl}" style="display: inline-block; background: #fff; color: #111; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600;">Resetear contraseña</a></p>
          <p style="color: #888; font-size: 14px;">Este link expira en 1 hora. Si no solicitaste este cambio, podés ignorar este email.</p>
        </div>
      </div>
    `,
  });
}
