import { expect, test, type Page } from "@playwright/test";

type ListingProduct = {
  name: string;
  slug: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStockWhatsappMessage(productName: string, sizeLabel?: string) {
  const detail = sizeLabel ? ` (${sizeLabel})` : "";
  return encodeURIComponent(`Hola, quiero reservar ${productName}${detail} y coordinar entrega con thewestrep.`);
}

async function goToCatalogHub(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /streetwear listo para comprar o encargar/i })).toBeVisible();
  await page.getByRole("link", { name: /ver catálogo/i }).first().click();
  await expect(page).toHaveURL(/\/catalogo$/);
}

async function getFirstListingProduct(page: Page, availability: "stock" | "encargue"): Promise<ListingProduct | null> {
  const productDetailLink = page.getByRole("link", { name: /ver detalle de/i }).first();

  if ((await productDetailLink.count()) === 0) {
    return null;
  }

  await expect(productDetailLink).toBeVisible();

  const href = await productDetailLink.getAttribute("href");

  if (!href) {
    throw new Error("Expected product detail link with href.");
  }

  const slugMatch = href.match(new RegExp(`/${availability}/([^/?#]+)$`, "i"));

  if (!slugMatch?.[1]) {
    throw new Error(`Expected ${availability} product detail href, got '${href}'.`);
  }

  const accessibleName = (await productDetailLink.getAttribute("aria-label")) ?? "";
  const nameMatch = accessibleName.match(/ver detalle de\s+(.+)/i);
  const name = nameMatch?.[1]?.trim();

  if (!name) {
    throw new Error(`Expected product link aria-label with product name, got '${accessibleName}'.`);
  }

  return {
    name,
    slug: slugMatch[1],
  };
}

async function openProductDetailFromListing(
  page: Page,
  availability: "stock" | "encargue",
  product: ListingProduct,
) {
  const productDetailLink = page.getByRole("link", { name: new RegExp(`ver detalle de ${escapeRegExp(product.name)}`, "i") }).first();

  await expect(productDetailLink).toBeVisible();
  await productDetailLink.click();
  await expect(page).toHaveURL(new RegExp(`/${availability}/${product.slug}$`));
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(product.name), "i") })).toBeVisible();
}

async function selectFirstAvailablePdpSize(page: Page): Promise<string | null> {
  const sizeButton = page.locator("section:has-text('Talles') button:not([disabled])").first();

  if ((await sizeButton.count()) === 0) {
    return null;
  }

  const buttonText = ((await sizeButton.innerText()) ?? "").trim();
  const sizeLabel = buttonText.split(/\s+/)[0]?.trim() ?? "";

  await sizeButton.click();
  return sizeLabel || null;
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

  const stockProduct = await getFirstListingProduct(page, "stock");

  if (stockProduct) {
    await openProductDetailFromListing(page, "stock", stockProduct);
    await expect(page.getByRole("link", { name: /catálogos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /stock/i })).toBeVisible();
    await page.getByRole("link", { name: /catálogos/i }).click();
  } else {
    await expect(page.getByText(/no hay stock/i)).toBeVisible();
    await page.getByRole("link", { name: /ver ambos catálogos/i }).click();
  }

  await expect(page).toHaveURL(/\/catalogo$/);
  await page.getByRole("link", { name: /abrir encargues/i }).click();

  await expect(page).toHaveURL(/\/encargue$/);
  await expect(page.getByRole("heading", { name: /elegí el producto y avanzá sin trámites/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver ambos catálogos/i })).toBeVisible();

  const encargueProduct = await getFirstListingProduct(page, "encargue");

  if (encargueProduct) {
    await openProductDetailFromListing(page, "encargue", encargueProduct);
    await expect(page.getByRole("link", { name: /catálogos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^encargue$/i })).toBeVisible();
  } else {
    await expect(page.getByText(/no hay encargues/i)).toBeVisible();
  }
});

test("links homepage categories to encargue listing when category cards exist", async ({ page }) => {
  await page.goto("/");

  const categorySection = page.locator("section#categorias");
  const firstCategoryLink = categorySection.getByRole("link", { name: /ver categoría/i }).first();

  if ((await firstCategoryLink.count()) > 0) {
    await firstCategoryLink.click();
    await expect(page).toHaveURL(/\/encargue\?category=/);
    await expect(page.getByRole("heading", { name: /elegí el producto y avanzá sin trámites/i })).toBeVisible();
  } else {
    await expect(page.getByText(/todavía no hay categorías con encargues publicados/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /ir al catálogo de encargues/i })).toBeVisible();
  }
});

test("renders delivery estimates and handles empty stock spotlight on home", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/2-5 días/i).first()).toBeVisible();
  await expect(page.getByText(/30-60 días/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /selección inmediata/i })).toBeVisible();

  const stockSelection = page.locator("section#seleccion-inmediata");
  const stockProductLink = stockSelection.getByRole("link", { name: /ver detalle de/i }).first();

  if ((await stockProductLink.count()) > 0) {
    await expect(stockProductLink).toBeVisible();
    await expect(stockSelection.getByText(/stock inmediato/i).first()).toBeVisible();
  } else {
    await expect(stockSelection.getByText(/no hay productos de stock publicados ahora/i)).toBeVisible();
    await expect(stockSelection.getByRole("link", { name: /abrir catálogo de stock/i })).toBeVisible();
  }
});

test("renders stock and encargue listings and opens product details when available", async ({ page }) => {
  await page.goto("/stock");

  await expect(page.getByRole("heading", { name: /stock listo para elegir y cerrar/i })).toBeVisible();
  const stockProduct = await getFirstListingProduct(page, "stock");

  if (stockProduct) {
    await openProductDetailFromListing(page, "stock", stockProduct);
  } else {
    await expect(page.getByText(/no hay stock/i)).toBeVisible();
  }

  await page.goto("/encargue");

  await expect(page.getByRole("heading", { name: /elegí el producto y avanzá sin trámites/i })).toBeVisible();
  const encargueProduct = await getFirstListingProduct(page, "encargue");

  if (encargueProduct) {
    await openProductDetailFromListing(page, "encargue", encargueProduct);
  } else {
    await expect(page.getByText(/no hay encargues/i)).toBeVisible();
  }
});

test("keeps stock WhatsApp CTA coherent without assuming hardcoded products", async ({ page }) => {
  await page.goto("/stock");

  const stockProduct = await getFirstListingProduct(page, "stock");

  if (!stockProduct) {
    await expect(page.getByText(/no hay stock/i)).toBeVisible();
    return;
  }

  await openProductDetailFromListing(page, "stock", stockProduct);

  const whatsappCta = page.getByRole("link", { name: /reservar por whatsapp/i });

  await expect(whatsappCta).toHaveAttribute("href", new RegExp(escapeRegExp(buildStockWhatsappMessage(stockProduct.name))));

  const selectedSize = await selectFirstAvailablePdpSize(page);

  if (selectedSize) {
    await expect(whatsappCta).toHaveAttribute(
      "href",
      new RegExp(escapeRegExp(buildStockWhatsappMessage(stockProduct.name, selectedSize))),
    );
    await expect(page.getByRole("button", { name: /agregar al carrito/i })).toBeEnabled();
  } else {
    await expect(page.getByRole("button", { name: /agregar al carrito/i })).toBeEnabled();
  }
});

test("shows commercial context on listing cards and PDP before WhatsApp conversion", async ({ page }) => {
  await page.goto("/stock");

  const stockProduct = await getFirstListingProduct(page, "stock");

  if (!stockProduct) {
    await expect(page.getByText(/no hay stock/i)).toBeVisible();
    return;
  }

  const stockCard = page.getByRole("link", { name: new RegExp(`ver detalle de ${escapeRegExp(stockProduct.name)}`, "i") }).first();

  await expect(stockCard).toBeVisible();
  await expect(stockCard.getByText(/entrega|encargue|stock/i).first()).toBeVisible();

  await openProductDetailFromListing(page, "stock", stockProduct);
  await expect(page.getByText(/detalle del producto/i)).toBeVisible();
  await expect(page.getByText(/tiempo estimado/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /whatsapp/i }).first()).toBeVisible();

  await page.goto("/encargue");
  const encargueProduct = await getFirstListingProduct(page, "encargue");

  if (!encargueProduct) {
    await expect(page.getByText(/no hay encargues/i)).toBeVisible();
    return;
  }

  await openProductDetailFromListing(page, "encargue", encargueProduct);
  await expect(page.getByText(/tiempo estimado/i)).toBeVisible();
});

test("moves from cart drawer to checkout when stock items exist", async ({ page }) => {
  await page.goto("/stock");

  const stockProduct = await getFirstListingProduct(page, "stock");

  if (!stockProduct) {
    await page.goto("/checkout");
    await expect(page.getByText(/checkout vacío/i)).toBeVisible();
    await expect(page.getByText(/todavía no hay productos para cerrar/i)).toBeVisible();
    return;
  }

  await openProductDetailFromListing(page, "stock", stockProduct);

  const selectedSize = await selectFirstAvailablePdpSize(page);

  if (selectedSize) {
    await expect(page.getByRole("link", { name: /reservar por whatsapp/i })).toHaveAttribute(
      "href",
      new RegExp(escapeRegExp(buildStockWhatsappMessage(stockProduct.name, selectedSize))),
    );
  }

  await page.getByRole("button", { name: /agregar al carrito/i }).click();

  const cartDrawer = page.locator("aside");

  await expect(cartDrawer).toBeVisible();
  await expect(cartDrawer.getByText(new RegExp(escapeRegExp(stockProduct.name), "i"))).toBeVisible();

  if (selectedSize) {
    await expect(cartDrawer.getByText(new RegExp(`^${escapeRegExp(selectedSize)}$`, "i"))).toBeVisible();
  }

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
  await expect(page.getByText(new RegExp(escapeRegExp(stockProduct.name), "i"))).toBeVisible();
});
