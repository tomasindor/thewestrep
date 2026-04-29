import { createCustomerSessionRouteHandler } from "@/lib/auth/customer-auth-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerSessionRouteHandler();

export async function GET(request: Request) {
  return handler(request);
}
