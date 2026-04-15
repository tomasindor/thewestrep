import { createAdminImportsRouteHandlers } from "@/lib/imports/admin-imports-route-handlers";

export const runtime = "nodejs";

const handlers = createAdminImportsRouteHandlers();

export async function GET(request: Request) {
  return handlers.GET(request);
}

export async function POST(request: Request) {
  return handlers.POST(request);
}
