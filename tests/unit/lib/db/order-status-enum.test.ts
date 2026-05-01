import assert from "node:assert/strict";
import test from "node:test";

// Import schema enums and types to verify they match spec
import {
  orderStatusEnum,
  paymentStatusEnum,
  orders,
  orderAuditLogs,
} from "../../../../lib/db/schema";

test("orderStatusEnum contains only pending_payment and paid", () => {
  const expected = ["pending_payment", "paid"];

  assert.deepStrictEqual(orderStatusEnum.enumValues, expected);
});

test("paymentStatusEnum contains all required values", () => {
  const expected = ["pending", "awaiting_transfer", "approved", "rejected", "expired", "cancelled"];

  assert.deepStrictEqual(paymentStatusEnum.enumValues, expected);
});

test("orders table has paymentStatus column", () => {
  const columnNames = Object.keys(orders);

  assert.ok(columnNames.includes("paymentStatus"), "orders table should have paymentStatus column");
});

test("orders table has province and city columns", () => {
  const columnNames = Object.keys(orders);

  assert.ok(columnNames.includes("provinceId"), "orders table should have provinceId column");
  assert.ok(columnNames.includes("provinceName"), "orders table should have provinceName column");
  assert.ok(columnNames.includes("cityId"), "orders table should have cityId column");
  assert.ok(columnNames.includes("cityName"), "orders table should have cityName column");
});

test("orders status default is pending_payment", () => {
  // Drizzle columns expose their config; we verify the default was set correctly
  const statusColumn = (orders as unknown as Record<string, unknown>).status as { default: string } | undefined;

  assert.equal(statusColumn?.default, "pending_payment", "default status should be pending_payment");
});

test("province and city columns are nullable", () => {
  const ordersAsRecord = orders as unknown as Record<string, unknown>;
  const provinceIdColumn = ordersAsRecord.provinceId as { notNull: boolean } | undefined;
  const cityIdColumn = ordersAsRecord.cityId as { notNull: boolean } | undefined;

  assert.ok(!provinceIdColumn?.notNull, "provinceId should be nullable");
  assert.ok(!cityIdColumn?.notNull, "cityId should be nullable");
});

test("order_audit_logs table exists with required columns", () => {
  const columnNames = Object.keys(orderAuditLogs);

  assert.ok(columnNames.includes("id"), "should have id column");
  assert.ok(columnNames.includes("orderId"), "should have orderId column");
  assert.ok(columnNames.includes("adminId"), "should have adminId column");
  assert.ok(columnNames.includes("action"), "should have action column");
  assert.ok(columnNames.includes("previousValue"), "should have previousValue column");
  assert.ok(columnNames.includes("newValue"), "should have newValue column");
  assert.ok(columnNames.includes("createdAt"), "should have createdAt column");
});
