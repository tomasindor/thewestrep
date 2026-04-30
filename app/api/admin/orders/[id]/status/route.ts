import { createAdminOrdersRouteHandlers } from "@/lib/orders/admin-route-handlers";

export const runtime = "nodejs";

const handlers = createAdminOrdersRouteHandlers();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlers.updateOrderStatus(request, id);
}
