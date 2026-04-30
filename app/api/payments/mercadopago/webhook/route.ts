import { NextResponse } from "next/server";

import { getDb } from "@/lib/db/core";
import { getMercadoPagoWebhookSecret } from "@/lib/env";
import {
  defaultProcessWebhookDeps,
  mapMercadoPagoPaymentStatus,
  processMercadoPagoWebhook,
  verifyMercadoPagoSignature,
} from "@/lib/payments/mercadopago-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signatureHeader = request.headers.get("x-signature") ?? "";
  const requestIdHeader = request.headers.get("x-request-id") ?? "";
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? "";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const result = await processMercadoPagoWebhook(
    payload as import("@/lib/payments/mercadopago-webhook").MercadoPagoWebhookPayload,
    {
      signatureHeader,
      requestIdHeader,
      dataId,
    },
    {
      verifySignature: verifyMercadoPagoSignature,
      getWebhookSecret: getMercadoPagoWebhookSecret,
      getDbInstance: getDb,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: defaultProcessWebhookDeps.getPayment,
    },
  );

  return NextResponse.json({ message: result.message }, { status: result.status });
}
