import { createCustomerRegisterRouteHandler } from "@/lib/auth/customer-auth-route-handlers";

export const runtime = "nodejs";

const handler = createCustomerRegisterRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
