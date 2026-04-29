import { createOrdersRouteHandler } from "@/lib/orders/orders-route-handler";

export const runtime = "nodejs";

const handler = createOrdersRouteHandler();

export async function POST(request: Request) {
  return handler(request);
}
