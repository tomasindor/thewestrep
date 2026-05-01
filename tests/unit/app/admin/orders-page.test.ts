import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

test("admin orders page exists as server component", () => {
  const filePath = path.resolve("./app/admin/(protected)/orders/page.tsx");
  assert.ok(fs.existsSync(filePath), "orders page should exist");

  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes('import { requireAdminSession } from "@/lib/auth/session"'), "should import requireAdminSession");
  assert.ok(source.includes("export default async function"), "should be async server component");
  assert.ok(source.includes("/api/admin/orders"), "should fetch from /api/admin/orders");
});

test("admin orders page renders table with correct columns", () => {
  const filePath = path.resolve("./app/admin/(protected)/orders/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes("Referencia"), "should have Referencia column");
  assert.ok(source.includes("Cliente"), "should have Cliente column");
  assert.ok(source.includes("Total"), "should have Total column");
  assert.ok(source.includes("Estado"), "should have Estado column");
});

test("admin orders page links to order detail", () => {
  const filePath = path.resolve("./app/admin/(protected)/orders/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes('href={`/admin/orders/'), "should link to /admin/orders/[id]");
});

test("admin orders page shows status badges with correct colors", () => {
  const filePath = path.resolve("./app/admin/(protected)/orders/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes("amber"), "should use amber for pending_payment");
  assert.ok(source.includes("emerald"), "should use emerald for paid");
  assert.ok(source.includes("pending_payment"), "should handle pending_payment status");
});

test("OrderTabs client component exists", () => {
  const filePath = path.resolve("./components/admin/order-tabs.tsx");
  assert.ok(fs.existsSync(filePath), "order-tabs.tsx should exist");

  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes('"use client"'), "should be a client component");
  assert.ok(source.includes("useSearchParams"), "should use useSearchParams");
  assert.ok(source.includes("Todos"), "should have Todos tab");
  assert.ok(source.includes("Pendientes"), "should have Pendientes tab");
  assert.ok(source.includes("Pagados"), "should have Pagados tab");
});

test("admin orders page uses OrderTabs", () => {
  const filePath = path.resolve("./app/admin/(protected)/orders/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes("OrderTabs"), "should import and use OrderTabs");
});

test("admin orders page has dark admin styling", () => {
  const filePath = path.resolve("./app/admin/(protected)/orders/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes("border-white/10"), "should use dark border style");
  assert.ok(source.includes("bg-white/[0.03]"), "should use dark surface style");
});
