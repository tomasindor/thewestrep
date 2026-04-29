export function hasCustomerSessionCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith("customer_session="));
}

export function shouldBlockAdminLogin(input: { hasAdminSession: boolean; hasCustomerSession: boolean }): boolean {
  return !input.hasAdminSession && input.hasCustomerSession;
}
