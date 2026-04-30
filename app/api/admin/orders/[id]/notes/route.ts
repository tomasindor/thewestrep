import { createAdminOrdersRouteHandlers } from "@/lib/orders/admin-route-handlers";

export const runtime = "nodejs";

const handlers = createAdminOrdersRouteHandlers();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlers.addNote(request, id);
}
