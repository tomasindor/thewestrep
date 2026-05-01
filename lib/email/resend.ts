import { Resend } from "resend";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    throw new Error("Missing RESEND_API_KEY configuration.");
  }

  return new Resend(key);
}

function getBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderAuthEmailTemplate(content: { title: string; body: string; ctaLabel: string; ctaHref: string; footer: string }) {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const logoUrl = `${baseUrl}/logo-ui.webp`;

  return `
      <div style="background:#07090e;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e7e9ef;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:linear-gradient(180deg,#11141c 0%,#090c13 100%);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 10px;">
              <img src="${logoUrl}" alt="TheWestRep" width="56" height="56" style="display:block;border:0;outline:none;text-decoration:none;" />
              <p style="margin:12px 0 0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#a7afc3;">TheWestRep</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 8px;">
              <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;">${escapeHtml(content.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#d2d8e6;">${escapeHtml(content.body)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <a href="${content.ctaHref}" style="display:inline-block;background:#f3d9e0;color:#151723;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(content.ctaLabel)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8f98ad;">${escapeHtml(content.footer)}</p>
            </td>
          </tr>
        </table>
        <p style="max-width:620px;margin:14px auto 0;padding:0 12px;font-size:11px;line-height:1.5;text-align:center;color:#6e778d;">
          Si el botón no funciona, copiá y pegá este link en tu navegador:<br />
          <span style="word-break:break-all;color:#93a1c5;">${content.ctaHref}</span>
        </p>
      </div>
    `;
}

export async function sendVerificationEmail(to: string, token: string, returnUrl?: string): Promise<void> {
  const params = new URLSearchParams({ token });
  if (returnUrl) {
    params.set("returnUrl", returnUrl);
  }

  const verificationUrl = `${getBaseUrl()}/api/customer/verify?${params.toString()}`;
  const resend = getResendClient();

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@thewestrep.com",
    to,
    subject: "Verificá tu email — TheWestRep",
    html: renderAuthEmailTemplate({
      title: "Verificá tu email",
      body: "Confirmá tu email para habilitar tu cuenta y continuar con tu compra.",
      ctaLabel: "Verificar email",
      ctaHref: verificationUrl,
      footer: "Este link expira en 24 horas. Si no creaste esta cuenta, podés ignorar este email.",
    }),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
  const resend = getResendClient();

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@thewestrep.com",
    to,
    subject: "Reset de contraseña — TheWestRep",
    html: renderAuthEmailTemplate({
      title: "Reset de contraseña",
      body: "Recibimos una solicitud para resetear tu contraseña.",
      ctaLabel: "Resetear contraseña",
      ctaHref: resetUrl,
      footer: "Este link expira en 1 hora. Si no solicitaste este cambio, podés ignorar este email.",
    }),
  });
}

export interface OrderConfirmationEmailParams {
  orderReference: string;
  items: Array<{ name: string; quantity: number; priceArs: number }>;
  totalArs: number;
  paymentMethod: "mercadopago" | "whatsapp";
  nextSteps: string;
  contactChannel: string;
  mpCheckoutUrl?: string;
}

export function renderOrderConfirmationEmailTemplate(params: OrderConfirmationEmailParams): string {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const logoUrl = `${baseUrl}/logo-ui.webp`;

  const itemsHtml = params.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#d2d8e6;font-size:14px;">${escapeHtml(item.name)} × ${item.quantity}</td><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#d2d8e6;font-size:14px;text-align:right;">$ ${item.priceArs.toLocaleString("es-AR")}</td></tr>`,
    )
    .join("");

  const totalFormatted = params.totalArs.toLocaleString("es-AR");
  const paymentMethodLabel = params.paymentMethod === "mercadopago" ? "Mercado Pago" : "Transferencia / WhatsApp";

  const ctaBlock =
    params.paymentMethod === "mercadopago" && params.mpCheckoutUrl
      ? `<tr><td style="padding:20px 32px 0;"><a href="${escapeHtml(params.mpCheckoutUrl)}" style="display:inline-block;background:#f3d9e0;color:#151723;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:700;text-decoration:none;">Pagar con Mercado Pago</a></td></tr>`
      : "";

  return `
    <div style="background:#07090e;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e7e9ef;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:linear-gradient(180deg,#11141c 0%,#090c13 100%);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px 10px;">
            <img src="${logoUrl}" alt="TheWestRep" width="56" height="56" style="display:block;border:0;outline:none;text-decoration:none;" />
            <p style="margin:12px 0 0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#a7afc3;">TheWestRep</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 8px;">
            <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;">¡Pedido confirmado! ${escapeHtml(params.orderReference)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 0;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#d2d8e6;">
              Tu pedido fue recibido y está pendiente de confirmación de pago.
              Una vez que verificamos el pago, te contactaremos para coordinar la entrega.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${itemsHtml}
              <tr><td style="padding:10px 0 0;color:#ffffff;font-size:15px;font-weight:700;">Total</td><td style="padding:10px 0 0;color:#ffffff;font-size:15px;font-weight:700;text-align:right;">$ ${totalFormatted}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 0;">
            <p style="margin:0;font-size:13px;color:#8f98ad;">Método de pago: <strong style="color:#d2d8e6;">${paymentMethodLabel}</strong></p>
          </td>
        </tr>
        ${ctaBlock}
        <tr>
          <td style="padding:16px 32px 8px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#d2d8e6;">${escapeHtml(params.nextSteps)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#8f98ad;">Canal de contacto: <strong style="color:#d2d8e6;">${escapeHtml(params.contactChannel)}</strong></p>
          </td>
        </tr>
      </table>
      <p style="max-width:620px;margin:14px auto 0;padding:0 12px;font-size:11px;line-height:1.5;text-align:center;color:#6e778d;">
        Si tenés alguna duda, escribinos por WhatsApp o email.
      </p>
    </div>
  `;
}

export async function sendOrderConfirmationEmail(
  order: {
    id: string;
    reference: string;
    checkoutMode: string;
    authProvider: string;
    customerAccountId: string | null;
    totalAmountArs: number;
    paymentMethod: "mercadopago" | "whatsapp";
    paymentStatus: string;
  },
  payload: {
    customer: Record<string, unknown>;
    items: Record<string, unknown>[];
  },
  _paymentMethod: "mercadopago" | "whatsapp",
  mpCheckoutUrl: string | null,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Resend not configured — non-blocking, log and continue
    console.warn("[email] RESEND_API_KEY not configured, skipping order confirmation email");
    return;
  }

  const items = (payload.items as Array<{ productName?: string; name?: string; quantity: number; priceDisplay?: string; priceArs?: number }>).map((item) => ({
    name: item.productName ?? (item.name as string) ?? "Producto",
    quantity: item.quantity,
    priceArs: item.priceArs ?? Number(item.priceDisplay?.replace(/[^\d]/g, "")) ?? 0,
  }));

  const nextSteps =
    order.paymentMethod === "mercadopago"
      ? "Completá el pago en Mercado Pago para confirmar tu pedido."
      : "Te contactaremos por WhatsApp para coordinar el pago.";

  const contactChannel = (payload.customer.name as string) || "WhatsApp";

  const html = renderOrderConfirmationEmailTemplate({
    orderReference: order.reference,
    items,
    totalArs: order.totalAmountArs,
    paymentMethod: order.paymentMethod,
    nextSteps,
    contactChannel,
    mpCheckoutUrl: mpCheckoutUrl ?? undefined,
  });

  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@thewestrep.com",
    to: payload.customer.email as string,
    subject: `¡Pedido confirmado! ${order.reference} — TheWestRep`,
    html,
  });
}
