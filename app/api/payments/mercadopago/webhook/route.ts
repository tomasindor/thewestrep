import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";

async function validateSignature(request: Request, rawBody: string): Promise<boolean> {
  const signature = request.headers.get("x-signature");
  if (!signature) return false;

  const expectedSignature = createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET || "")
    .update(rawBody)
    .digest("hex");

  return signature === expectedSignature;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!(await validateSignature(request, rawBody))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as { type?: string };
    return NextResponse.json({ status: "processed", eventType: body.type ?? null });
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}
