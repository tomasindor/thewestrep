import { createCustomerForgotPasswordRouteHandler } from "@/lib/auth/customer-password-reset-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerForgotPasswordRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
