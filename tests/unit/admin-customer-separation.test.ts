import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  hasCustomerSessionCookie,
  shouldBlockAdminLogin,
} from "../../lib/auth/admin-boundary";

test("authOptions config uses dedicated admin session cookie name", async () => {
  const source = await readFile(new URL("../../lib/auth.ts", import.meta.url), "utf8");

  assert.match(source, /name:\s*["'`]admin-session["'`]/);
  assert.match(source, /signIn:\s*["'`]\/admin\/login["'`]/);
});

test("detects customer cookie without conflating NextAuth admin cookie", () => {
  assert.equal(hasCustomerSessionCookie("customer_session=abc"), true);
  assert.equal(hasCustomerSessionCookie("next-auth.session-token=jwt"), false);
  assert.equal(hasCustomerSessionCookie("foo=bar; customer_session=xyz; something=else"), true);
});

test("blocks admin login only when customer session exists and no admin session", () => {
  assert.equal(shouldBlockAdminLogin({ hasAdminSession: false, hasCustomerSession: true }), true);
  assert.equal(shouldBlockAdminLogin({ hasAdminSession: true, hasCustomerSession: true }), false);
  assert.equal(shouldBlockAdminLogin({ hasAdminSession: false, hasCustomerSession: false }), false);
});
