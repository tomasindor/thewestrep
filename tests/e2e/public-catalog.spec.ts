import { expect, test, type Page } from "@playwright/test";

const stockProduct = {
  name: "Essentials Core Hoodie",
  slug: "essentials-core-hoodie",
};

const encargueProduct = {
  name: "Bape College Hoodie",
  slug: "bape-college-hoodie",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectPdpSize(page: Page, sizeLabel: string, expectedEncodedMessage: string) {
  const sizeButton = page.getByRole("button", { name: new RegExp(`^${sizeLabel}\\b`, "i") });
  const whatsappCta = page.getByRole("link", { name: /reservar por whatsapp|cotizar por whatsapp/i });
  const addToCartButton = page.getByRole("button", { name: /agregar al carrito/i });

  await sizeButton.click();
  await expect(whatsappCta).toHaveAttribute("href", new RegExp(escapeRegExp(expectedEncodedMessage)));
  await expect(addToCartButton).toBeEnabled();
}

async function goToCatalogHub(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /streetwear listo para comprar o encargar/i })).toBeVisible();
  await page.getByRole("link", { name: /ver catálogo/i }).first().click();
  await expect(page).toHaveURL(/\/catalogo$/);
}

async function openProductDetailFromListing(
  page: Page,
  availability: "stock" | "encargue",
  product: { name: string; slug: string },
) {
  const productDetailLink = page.getByRole("link", { name: new RegExp(`ver detalle de ${escapeRegExp(product.name)}`, "i") }).first();

  await expect(productDetailLink).toBeVisible();
  await Promise.all([
    page.waitForURL(new RegExp(`/${availability}/${product.slug}$`)),
    productDetailLink.click(),
  ]);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(product.name), "i") })).toBeVisible();
}

test("renders the accepted /catalogo hub with logo and two blocks only", async ({ page }) => {
  await page.goto("/catalogo");

  await expect(page.getByRole("link", { name: /volver al inicio/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /^catálogo$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /selección inmediata/i })).toBeVisible();

  const stockEntry = page.getByRole("link", { name: /abrir stock/i });
  const encargueEntry = page.getByRole("link", { name: /abrir encargues/i });

  await expect(stockEntry).toBeVisible();
  await expect(encargueEntry).toBeVisible();
  await expect(page.getByRole("heading", { name: /^stock$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /encargue internacional/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /whatsapp/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /ver ambos catálogos/i })).toHaveCount(0);
  await expect(page.getByText(/streetwear listo para comprar o encargar/i)).toHaveCount(0);
});

test("keeps navigation coherent from home to catalog hub, listings, and detail pages", async ({ page }) => {
  await goToCatalogHub(page);

  await page.getByRole("link", { name: /abrir stock/i }).click();

  await expect(page).toHaveURL(/\/stock$/);
  await expect(page.getByRole("heading", { name: /stock listo para elegir y cerrar/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver ambos catálogos/i })).toBeVisible();

  await openProductDetailFromListing(page, "stock", stockProduct);
  await expect(page.getByRole("link", { name: /catálogos/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /stock/i })).toBeVisible();

  await page.getByRole("link", { name: /catálogos/i }).click();

  await expect(page).toHaveURL(/\/catalogo$/);
  await page.getByRole("link", { name: /abrir encargues/i }).click();

  await expect(page).toHaveURL(/\/encargue$/);
  await expect(page.getByRole("heading", { name: /elegí en el catálogo y avanzá el encargue/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver ambos catálogos/i })).toBeVisible();

  await openProductDetailFromListing(page, "encargue", encargueProduct);
  await expect(page.getByRole("link", { name: /catálogos/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^encargue$/i })).toBeVisible();
});

test("links homepage categories to the right listing with the category filter applied", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: /hoodies/i }).click();

  await expect(page).toHaveURL(/\/encargue\?category=hoodies$/);
  await expect(page.getByRole("heading", { name: /elegí en el catálogo y avanzá el encargue/i })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`ver detalle de ${encargueProduct.name}`, "i") })).toBeVisible();
});

test("renders delivery estimates and the stock-focused home selection", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/entrega estimada/i)).toHaveCount(2);
  await expect(page.getByText(/2-5 días/i)).toBeVisible();
  await expect(page.getByText(/30-60 días/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /selección inmediata/i })).toBeVisible();

  const stockSelection = page.locator("section#seleccion-inmediata");

  await expect(stockSelection.getByRole("link", { name: new RegExp(`ver detalle de ${stockProduct.name}`, "i") })).toBeVisible();
  await expect(stockSelection.getByText(/stock inmediato/i).first()).toBeVisible();
});

test("renders stock and encargue listings and opens product details", async ({ page }) => {
  await page.goto("/stock");

  await expect(page.getByRole("heading", { name: /stock listo para elegir y cerrar/i })).toBeVisible();
  await openProductDetailFromListing(page, "stock", stockProduct);

  await page.goto("/encargue");

  await expect(page.getByRole("heading", { name: /elegí en el catálogo y avanzá el encargue/i })).toBeVisible();
  await openProductDetailFromListing(page, "encargue", encargueProduct);
});

test("updates WhatsApp CTA href when selecting a size on stock PDP", async ({ page }) => {
  await page.goto(`/stock/${stockProduct.slug}`);

  const whatsappCta = page.getByRole("link", { name: /reservar por whatsapp/i });
  const defaultMessage = encodeURIComponent(
    "Hola, quiero reservar Essentials Core Hoodie y coordinar entrega con thewestrep.",
  );
  const mediumSizeMessage = encodeURIComponent(
    "Hola, quiero reservar Essentials Core Hoodie (M) y coordinar entrega con thewestrep.",
  );

  await expect(whatsappCta).toHaveAttribute("href", new RegExp(defaultMessage));
  await selectPdpSize(page, "M", mediumSizeMessage);
});

test("shows commercial context on listing cards and PDP before WhatsApp conversion", async ({ page }) => {
  await page.goto("/stock");

  const stockCard = page.getByRole("link", { name: new RegExp(`ver detalle de ${stockProduct.name}`, "i") });

  await expect(stockCard.getByText(/hoodie de algodón pesado con fit relajado/i)).toBeVisible();
  await expect(stockCard.getByText(/entrega coordinada en 24\/48 hs/i)).toBeVisible();
  await expect(stockCard.getByText(/3 talles/i)).toBeVisible();

  await openProductDetailFromListing(page, "stock", stockProduct);
  await expect(page.getByRole("heading", { name: new RegExp(stockProduct.name, "i") })).toBeVisible();
  await expect(page.getByText(/detalle del producto/i)).toBeVisible();
  await expect(page.getByText(/tiempo estimado/i)).toBeVisible();
  await expect(page.getByText(/coordiná stock y entrega por whatsapp/i).first()).toBeVisible();
  await expect(page.getByText(/entrega coordinada en 24\/48 hs/i)).toBeVisible();

  await page.goto(`/encargue/${encargueProduct.slug}`);

  await expect(page.getByRole("heading", { name: new RegExp(encargueProduct.name, "i") })).toBeVisible();
  await expect(page.getByText(/arribo estimado de 40-60 días/i)).toBeVisible();
});

test("moves from cart drawer to checkout and closes a simulated order", async ({ page }) => {
  await page.goto(`/stock/${stockProduct.slug}`);

  await selectPdpSize(
    page,
    "M",
    encodeURIComponent("Hola, quiero reservar Essentials Core Hoodie (M) y coordinar entrega con thewestrep."),
  );
  await page.getByRole("button", { name: /agregar al carrito/i }).click();

  const cartDrawer = page.locator("aside");

  await expect(cartDrawer).toBeVisible();
  await expect(cartDrawer.getByText(stockProduct.name)).toBeVisible();
  await expect(cartDrawer.getByText(/^m$/i)).toBeVisible();

  await page.getByRole("link", { name: /ir al checkout/i }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: /cerrá tu pedido sin salir del storefront/i })).toBeVisible();

  await page.getByLabel(/nombre y apellido/i).fill("Juan Test");
  await page.getByLabel(/email o teléfono/i).fill("+54 11 5555 0000");
  await page.getByRole("button", { name: /envío caba\/gba/i }).click();
  await page.getByLabel(/dirección o localidad/i).fill("Palermo, CABA");
  await page.getByRole("button", { name: /confirmar pedido simulado/i }).click();

  await expect(page.getByRole("heading", { name: /checkout cerrado del lado cliente/i })).toBeVisible();
  await expect(page.getByText(/orden twr-/i)).toBeVisible();
  await expect(page.getByText(/juan test/i)).toBeVisible();
  await expect(page.getByText(/essentials core hoodie/i)).toBeVisible();
});
