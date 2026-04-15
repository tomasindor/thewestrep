import { expect, test } from "@playwright/test";

test.describe("admin imports product-centric curation", () => {
  test("renders final metadata and lower strip with only active images", async ({ page }) => {
    await page.goto("/admin/imports");

    const activeArticle = page.locator("article").first();

    await expect(activeArticle.getByText(/^nombre final$/i)).toBeVisible();
    await expect(activeArticle.getByText(/^precio final$/i)).toBeVisible();
    await expect(activeArticle.getByText(/^marca$/i)).toBeVisible();
    await expect(activeArticle.getByText(/^imágenes activas$/i)).toBeVisible();

    const stripButtons = page.locator('[data-testid="active-image-strip"] button[data-testid^="active-strip-image-"]');
    await expect(stripButtons).toHaveCount(1);
  });

  test("loads seeded queue item and navigates the carousel in Playwright mode", async ({ page }) => {
    await page.goto("/admin/imports");
    await expect(page).toHaveURL(/\/admin\/imports$/);

    const activeArticle = page.locator("article").first();

    await expect(page.getByRole("button", { name: "Promover elegibles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vaciar cola completa" })).toBeVisible();
    await expect(page.getByRole("button", { name: "← Anterior" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente →" })).toBeVisible();

    await expect(activeArticle.getByText(/producto \d+ de \d+/i)).toBeVisible();

    const counter = activeArticle.getByText(/imagen \d+\/\d+/i).first();
    await expect(counter).toBeVisible();
    const initialCounterText = await counter.textContent();

    const previewImage = page.locator("article img").first();
    await expect(previewImage).toHaveAttribute("src", /\/api\/admin\/imports\/proxy\?url=.*previewUrl=/);

    const sidebarButtons = page.locator("aside button");
    const sidebarCount = await sidebarButtons.count();
    for (let index = 0; index < sidebarCount; index += 1) {
      const text = await sidebarButtons.nth(index).textContent();
      const imageCountMatch = text?.match(/(\d+)\s+imágenes/i);
      const imageCount = imageCountMatch ? Number(imageCountMatch[1]) : 0;

      if (imageCount > 1) {
        await sidebarButtons.nth(index).click();
        break;
      }
    }

    const selectedCounterText = await counter.textContent();
    const selectedTotalMatch = selectedCounterText?.match(/\/(\d+)/i);
    const selectedTotal = selectedTotalMatch ? Number(selectedTotalMatch[1]) : 1;

    if (selectedTotal <= 1) {
      await expect(counter).toBeVisible();
      return;
    }

    await page.getByRole("button", { name: "Siguiente →" }).click();
    await expect(counter).not.toHaveText(initialCounterText ?? "");

    const nextCounterText = await counter.textContent();

    await page.keyboard.press("ArrowLeft");
    await expect(counter).not.toHaveText(nextCounterText ?? "");
  });

  test("bulk promotion feedback reports promoted and blocked items with reasons", async ({ page }) => {
    await page.route("**/api/admin/imports", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            promotedCount: 1,
            promotedItemIds: ["pw-item-1"],
            blocked: [{
              itemId: "pw-item-2",
              reason: "insufficient useful images",
            }],
          },
        }),
      });
    });

    await page.goto("/admin/imports");
    await page.getByRole("button", { name: "Promover elegibles" }).click();

    await expect(page.getByText(/promovidos: 1/i)).toBeVisible();
    await expect(page.getByText(/bloqueados: 1/i)).toBeVisible();
    await expect(page.getByText(/insufficient useful images/i)).toBeVisible();
  });
});
