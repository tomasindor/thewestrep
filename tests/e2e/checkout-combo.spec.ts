import { expect, test } from "@playwright/test";

const CART_STORAGE_KEY = "thewestrep.cart.v2";

test("keeps combo discount visible between checkout summary and cart drawer", async ({ page }) => {
  await page.addInitScript(({ storageKey }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      items: [
        {
          id: "combo-top::negro::m",
          productId: "combo-top",
          productSlug: "buzo-combo",
          productName: "Buzo Combo",
          availability: "encargue",
          availabilityLabel: "Encargue",
          priceDisplay: "$ 50.000",
          quantity: 1,
          categorySlug: "buzos",
          comboEligible: true,
          comboGroup: "winter-2026",
          comboPriority: 0,
        },
        {
          id: "combo-bottom::negro::m",
          productId: "combo-bottom",
          productSlug: "pantalon-combo",
          productName: "Pantalón Combo",
          availability: "encargue",
          availabilityLabel: "Encargue",
          priceDisplay: "$ 40.000",
          quantity: 1,
          categorySlug: "pantalones",
          comboEligible: true,
          comboGroup: "winter-2026",
          comboPriority: 0,
        },
      ],
      customer: {
        name: "Gonza Test",
        phone: "+54 9 11 5555 5555",
        email: "gonza@correo.com",
        cuil: "",
        checkoutMode: "guest",
        authProvider: "",
        preferredChannel: "whatsapp",
        customerStatus: "new",
        deliveryRecipient: "Gonza Test",
        fulfillment: "envio-caba-gba",
        location: "Palermo, CABA",
        notes: "",
      },
    }));
  }, { storageKey: CART_STORAGE_KEY });

  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: /cerrá tu pedido sin salir del storefront/i })).toBeVisible();
  await expect(page.getByText(/descuento combo/i)).toBeVisible();
  await expect(page.getByText(/-\$?\s*12\.000/i)).toBeVisible();

  await page.getByRole("button", { name: /editar carrito/i }).click();

  const drawer = page.locator("aside").last();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/descuento combo:\s*-\$?\s*12\.000/i)).toBeVisible();
  await expect(drawer.getByText(/buzo combo/i)).toBeVisible();
  await expect(drawer.getByText(/pantalón combo/i)).toBeVisible();
});
