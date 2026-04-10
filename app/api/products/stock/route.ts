export const runtime = "nodejs";

export async function GET() {
  return Response.json({ error: "Not implemented" }, { status: 501 });
}
