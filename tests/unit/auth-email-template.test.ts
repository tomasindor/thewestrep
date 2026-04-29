import assert from "node:assert/strict";
import test from "node:test";

import { renderAuthEmailTemplate } from "../../lib/email/resend";

test("verification auth email template includes branding logo, CTA and destination URL", () => {
  process.env.NEXTAUTH_URL = "https://thewestrep.com";

  const html = renderAuthEmailTemplate({
    title: "Verificá tu email",
    body: "Confirmá tu email para activar tu cuenta.",
    ctaLabel: "Verificar email",
    ctaHref: "https://thewestrep.com/api/customer/verify?token=abc",
    footer: "Este link expira en 24 horas.",
  });

  assert.match(html, /logo-ui\.webp/);
  assert.match(html, /TheWestRep/);
  assert.match(html, /Verificar email/);
  assert.match(html, /https:\/\/thewestrep\.com\/api\/customer\/verify\?token=abc/);
});
