import { createCustomerLoginRouteHandler } from "@/lib/auth/customer-auth-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerLoginRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
