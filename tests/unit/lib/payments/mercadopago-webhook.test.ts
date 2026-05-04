import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  mapMercadoPagoPaymentStatus,
  verifyMercadoPagoSignature,
} from "../../../../lib/payments/mercadopago-webhook";

test("mapMercadoPagoPaymentStatus: approved → approved", () => {
  assert.equal(mapMercadoPagoPaymentStatus("approved"), "approved");
});

test("mapMercadoPagoPaymentStatus: pending → pending", () => {
  assert.equal(mapMercadoPagoPaymentStatus("pending"), "pending");
});

test("mapMercadoPagoPaymentStatus: rejected → rejected", () => {
  assert.equal(mapMercadoPagoPaymentStatus("rejected"), "rejected");
});

test("mapMercadoPagoPaymentStatus: cancelled → cancelled", () => {
  assert.equal(mapMercadoPagoPaymentStatus("cancelled"), "cancelled");
});

test("mapMercadoPagoPaymentStatus: in_process → pending", () => {
  assert.equal(mapMercadoPagoPaymentStatus("in_process"), "pending");
});

test("mapMercadoPagoPaymentStatus: unknown → pending", () => {
  assert.equal(mapMercadoPagoPaymentStatus("unknown"), "pending");
});

test("verifyMercadoPagoSignature: valid signature passes", () => {
  const secret = "my-secret";
  const dataId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";
  const requestId = "2066ca19-c6f1-498a-be75-1923005edd06";
  const ts = "1742505638683";

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");

  const signature = `ts=${ts},v1=${hash}`;

  assert.equal(
    verifyMercadoPagoSignature(
      { signatureHeader: signature, requestIdHeader: requestId, dataId },
      secret,
    ),
    true,
  );
});

test("verifyMercadoPagoSignature: invalid signature fails", () => {
  const secret = "my-secret";
  assert.equal(
    verifyMercadoPagoSignature(
      {
        signatureHeader: "ts=1700000000,v1=invalidhash",
        requestIdHeader: "req",
        dataId: "ord",
      },
      secret,
    ),
    false,
  );
});

test("verifyMercadoPagoSignature: missing secret returns false", () => {
  assert.equal(
    verifyMercadoPagoSignature(
      {
        signatureHeader: "ts=1700000000,v1=abc",
        requestIdHeader: "req",
        dataId: "ord",
      },
      "",
    ),
    false,
  );
});

test("verifyMercadoPagoSignature: malformed signature returns false", () => {
  const secret = "my-secret";
  assert.equal(
    verifyMercadoPagoSignature(
      { signatureHeader: "malformed", requestIdHeader: "req", dataId: "ord" },
      secret,
    ),
    false,
  );
});
