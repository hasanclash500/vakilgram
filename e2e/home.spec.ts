import { expect, test } from "@playwright/test";

test.describe("public homepage", () => {
  test("renders Persian RTL legal assistant without requiring database data", async ({
    page
  }) => {
    await page.route("**/api/public/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ voiceEnabled: false })
      });
    });

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { level: 1, name: "وکیل‌گرام" })
    ).toBeVisible();

    await expect(page.getByLabel("پرسش حقوقی شما")).toBeVisible();
    await expect(page.getByLabel("شهر شما (اختیاری)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "دریافت پاسخ مستند" })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "ساده" })).toBeVisible();
    await expect(page.getByRole("button", { name: "تخصصی" })).toBeVisible();

    await expect(
      page.getByRole("link", { name: "مرور قوانین" })
    ).toHaveAttribute("href", "/laws");
    await expect(
      page.getByRole("link", { name: "دایرکتوری وکلا" })
    ).toHaveAttribute("href", "/lawyers");

    await expect(
      page.getByText(/جایگزین مشاوره رسمی وکیل/)
    ).toBeVisible();
  });

  test("switches answer mode in the client UI", async ({ page }) => {
    await page.route("**/api/public/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ voiceEnabled: false })
      });
    });

    await page.goto("/");

    const expert = page.getByRole("button", { name: "تخصصی" });
    await expert.click();
    await expect(expert).toHaveClass(/active/);
  });
});


test("renders the Persian 404 page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "صفحه پیدا نشد" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "بازگشت به صفحه اصلی" })
  ).toHaveAttribute("href", "/");
});
