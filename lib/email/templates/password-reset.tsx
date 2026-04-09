import * as React from "react";

interface PasswordResetTemplateProps {
  resetUrl: string;
  appName?: string;
}

/**
 * React email component for password reset — premium dark aesthetic.
 * For future use with @react-email/components when added to the project.
 * Currently, the HTML template in resend.ts is used directly.
 */
export function PasswordResetTemplate({
  resetUrl,
  appName = "TheWestRep",
}: PasswordResetTemplateProps) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ color: "#fff", background: "#111", padding: 24, margin: 0 }}>
        {appName}
      </h1>
      <div style={{ padding: 24, background: "#1a1a1a", color: "#e0e0e0" }}>
        <p>Recibimos una solicitud para resetear tu contraseña.</p>
        <p>
          <a
            href={resetUrl}
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#111",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            Resetear contraseña
          </a>
        </p>
        <p style={{ color: "#888", fontSize: 14 }}>
          Este link expira en 1 hora. Si no solicitaste este cambio, podés ignorar este email.
        </p>
      </div>
    </div>
  );
}
