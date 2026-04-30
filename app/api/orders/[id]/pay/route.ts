import { createPayRouteHandler } from "@/lib/payments/pay-route-handler";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const handler = createPayRouteHandler();
  return handler(request, context);
}
