import { createCustomerResetPasswordRouteHandler } from "@/lib/auth/customer-password-reset-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerResetPasswordRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
