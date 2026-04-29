import { createCustomerLogoutRouteHandler } from "@/lib/auth/customer-auth-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerLogoutRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
