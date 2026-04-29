import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";

interface VerifyEmailPageStateInput {
  returnUrl?: string | string[];
  email?: string | string[];
}

export function resolveVerifyEmailPageState(input: VerifyEmailPageStateInput) {
  const rawReturnUrl = Array.isArray(input.returnUrl) ? input.returnUrl[0] : input.returnUrl;
  const rawEmail = Array.isArray(input.email) ? input.email[0] : input.email;

  return {
    returnUrl: sanitizeAuthReturnUrl(rawReturnUrl, "/"),
    defaultEmail: rawEmail?.trim() || undefined,
  };
}
