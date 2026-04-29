import { createCustomerVerifyRouteHandler } from "@/lib/auth/customer-auth-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerVerifyRouteHandler();

export async function GET(request: Request) {
  return handler(request);
}
