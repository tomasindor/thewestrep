import { expect, test } from "@playwright/test";

test("register intent from checkout redirects to verify-email context", async ({ page }) => {
  await page.route("**/api/customer/register", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        verificationPending: true,
        redirectTo: "/verify-email?returnUrl=%2Fcheckout&email=checkout%40example.com",
      }),
    });
  });

  await page.goto("/register?returnUrl=/checkout");
  await expect(page).toHaveURL(/\/login\?mode=register&returnUrl=%2Fcheckout/);

  await page.getByRole("button", { name: "Crear cuenta", exact: true }).first().click();
  await page.getByLabel("Nombre completo").fill("Checkout Customer");
  await page.getByLabel("Email").fill("checkout@example.com");
  await page.getByLabel("Contraseña").first().fill("Secret123");
  await page.getByLabel("Repetir contraseña").fill("Secret123");
  await page.locator("form").getByRole("button", { name: "Crear cuenta", exact: true }).click();

  await expect(page).toHaveURL(/\/verify-email\?returnUrl=%2Fcheckout/);
  await expect(page.getByRole("heading", { name: /verificá tu email/i })).toBeVisible();
});

test("guest path from login gate keeps checkout accessible without account", async ({ page }) => {
  await page.goto("/login?returnUrl=/checkout");

  await expect(page.getByRole("button", { name: /seguir como invitado/i })).toBeVisible();
  await page.getByRole("button", { name: /seguir como invitado/i }).click();

  await expect(page).toHaveURL(/\/checkout$/);
});

test("login flow respects returnUrl from product context", async ({ page }) => {
  await page.route("**/api/customer/login", async (route) => {
    await route.fulfill({
      status: 303,
      headers: {
        location: "/stock/producto-demo",
        "set-cookie": "customer_session=test-session; Path=/; HttpOnly; SameSite=Lax",
      },
      body: "",
    });
  });

  await page.goto("/login?returnUrl=/stock/producto-demo");

  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Contraseña").first().fill("Secret123");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/stock\/producto-demo$/);
});

test("admin login remains isolated when a customer cookie exists", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "customer_session",
      value: "customer-cookie-token",
      url: "http://127.0.0.1:3100",
    },
  ]);

  await page.goto("/admin/login");

  await expect(page.getByText(/sesión customer detectada/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /cerrar sesión customer/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ir al login de clientes/i })).toBeVisible();
});
