export interface CheckoutVerificationInput {
  checkoutMode: "guest" | "account";
  emailVerified: string | null | undefined;
}

export function isEmailVerificationRequiredForAccountCheckout(input: CheckoutVerificationInput): boolean {
  if (input.checkoutMode !== "account") {
    return false;
  }

  return !input.emailVerified;
}

export function shouldRedirectCheckoutToVerifyEmail(input: CheckoutVerificationInput & { returnUrl: string }): string | null {
  if (!isEmailVerificationRequiredForAccountCheckout(input)) {
    return null;
  }

  return `/verify-email?returnUrl=${encodeURIComponent(input.returnUrl)}`;
}
