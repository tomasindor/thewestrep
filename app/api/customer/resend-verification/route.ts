import { createCustomerResendVerificationRouteHandler } from "@/lib/auth/customer-auth-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerResendVerificationRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
