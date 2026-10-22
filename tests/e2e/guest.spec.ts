import { test, expect } from "@playwright/test";
test("guest can explore the app and encounters a real auth wall", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("onboarding-v1", "done"));
  await page.goto("/");
  await expect(page.getByText("Topluluk için ilk adım")).toBeVisible();
  await page.getByRole("tab", { name: /Keşfet/ }).click();
  await expect(
    page.getByLabel("Ülke, belge, deneyim veya soru ara"),
  ).toBeVisible();
  await page.getByLabel("Ülke, belge, deneyim veya soru ara").fill("Estonya");
  await page.getByRole("tab", { name: /Paylaş/ }).click();
  await expect(page.getByText("Deneyimin birine yol göstersin")).toBeVisible();
  await page.getByRole("button", { name: "Giriş yap / Üye ol" }).click();
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Şifre", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("first visit has short optional onboarding", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Gerçek deneyimleri keşfet.")).toBeVisible();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await expect(page.getByText("Sana benzeyen başvuruları bul.")).toBeVisible();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page.getByRole("button", { name: "Akışıma git" }).click();
  await expect(page.getByText("Topluluk için ilk adım")).toBeVisible();
});
