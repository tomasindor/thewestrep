import { expect, test } from "@playwright/test";

test("Google button visibility follows server OAuth env configuration", async ({ page, request }) => {
  const start = await request.get("/api/customer-auth/google?returnUrl=/", { maxRedirects: 0 });

  await page.goto("/login");
  const googleButton = page.getByRole("button", { name: /continuar con google/i });

  if (start.status() === 501) {
    await expect(googleButton).toHaveCount(0);
    return;
  }

  expect(start.status()).toBe(303);
  await expect(googleButton).toHaveCount(1);
});

test("OAuth start sets state cookies and callback requires matching state", async ({ request }) => {
  const start = await request.get("/api/customer-auth/google?returnUrl=/checkout", {
    maxRedirects: 0,
  });

  const setCookie = start.headers()["set-cookie"] ?? "";
  expect(setCookie).toContain("google_oauth_state=");
  expect(setCookie).toContain("google_oauth_return_url=%2Fcheckout");

  const stateMatch = /google_oauth_state=([^;]+)/.exec(setCookie);
  expect(stateMatch?.[1]).toBeTruthy();

  const callback = await request.get("/api/customer-auth/google/callback?code=fake-code&state=wrong-state", {
    headers: {
      cookie: `google_oauth_state=${stateMatch?.[1]}; google_oauth_return_url=%2Fcheckout`,
    },
    maxRedirects: 0,
  });

  expect(callback.status()).toBe(303);
  expect(callback.headers().location).toContain("/login?error=oauth_failed");
});

test("callback with invalid state redirects to login error", async ({ request }) => {
  const response = await request.get("/api/customer-auth/google/callback?code=abc&state=invalid", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain("/login?error=oauth_failed");
});

test("unverified callback path surfaces generic oauth error", async ({ page }) => {
  await page.route("**/api/customer-auth/google/callback**", async (route) => {
    await route.fulfill({
      status: 303,
      headers: {
        location: "/login?error=oauth_failed",
      },
    });
  });

  await page.goto("/api/customer-auth/google/callback?code=any&state=any");
  await expect(page).toHaveURL(/\/login\?error=oauth_failed/);
  await expect(page.getByText(/no se pudo iniciar sesión con google/i)).toBeVisible();
});

test("admin login remains isolated without Google button", async ({ page }) => {
  await page.goto("/admin/login");

  await expect(page.getByRole("button", { name: /continuar con google/i })).toHaveCount(0);
});

test("happy path UX: mocked OAuth start redirects customer to checkout", async ({ page }) => {
  await page.route("**/api/customer-auth/google?**", async (route) => {
    await route.fulfill({
      status: 303,
      headers: {
        location: "/checkout",
        "set-cookie": "customer_session=mock-customer-session; Path=/; HttpOnly; SameSite=Lax",
      },
    });
  });

  await page.goto("/api/customer-auth/google?returnUrl=/checkout");

  await expect(page).toHaveURL(/\/checkout$/);
});
