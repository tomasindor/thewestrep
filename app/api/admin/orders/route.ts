import { createAdminOrdersRouteHandlers } from "@/lib/orders/admin-route-handlers";

export const runtime = "nodejs";

const handlers = createAdminOrdersRouteHandlers();

export async function GET(request: Request) {
  return handlers.listOrders(request);
}
