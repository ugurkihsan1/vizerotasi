import { test, expect, type Page } from "@playwright/test";
// Deterministic UI tests use transport fixtures only; the shipped app uses real Supabase.
async function fixtures(page: Page) {
  await page.route("https://*.supabase.co/**", async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === "/rest/v1/countries")
      return route.fulfill({
        json: [
          { id: "spain", name: "İspanya", flag: "🇪🇸", code: "ES" },
          { id: "estonia", name: "Estonya", flag: "🇪🇪", code: "EE" },
        ],
      });
    return route.fulfill({ json: [] });
  });
}
test("guest gets a guided feed with advanced filters hidden until requested", async ({
  page,
}) => {
  await fixtures(page);
  await page.addInitScript(() => localStorage.setItem("onboarding-v1", "done"));
  await page.goto("/");
  await expect(page.getByText("Her rota bir deneyimle başlar.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "İlk Schengen", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Filtrele", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "İlk Schengen", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sonuçları göster" }).click();
  await page
    .getByRole("button", { name: "Topluluğa katıl", exact: true })
    .click();
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yeni şifre" })).toHaveCount(0);
});
test("signup submits required metadata and offers a clear verification state", async ({
  page,
}) => {
  await fixtures(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/auth/v1/signup**", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      json: {
        id: "00000000-0000-0000-0000-000000000099",
        aud: "authenticated",
        role: "authenticated",
        email: "ui-test@example.com",
        identities: [],
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-10-22T00:00:00Z",
      },
    });
  });
  await page.goto("/auth?mode=signup");
  await page.getByLabel("Görünen ad", { exact: true }).fill("Test Yolcu");
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("test_yolcu");
  await page.getByLabel("E-posta", { exact: true }).fill("ui-test@example.com");
  await page
    .getByLabel("Şifre · en az 12 karakter", { exact: true })
    .fill("test-only-password-123");
  await page
    .getByRole("switch", {
      name: "Kullanım koşullarını kabul ediyorum",
      exact: true,
    })
    .click();
  await page
    .getByRole("switch", {
      name: "Gizlilik politikasını kabul ediyorum",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Hesabımı oluştur" }).click();
  await expect(
    page.getByText(
      "Doğrulama bağlantısını e-postana gönderdik. Spam klasörünü de kontrol et.",
    ),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    email: "ui-test@example.com",
    data: {
      username: "test_yolcu",
      terms_accepted: true,
      privacy_accepted: true,
    },
  });
});
test("Spain retains 13 documents, changes employment details and persists checks", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/country/spain");
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await expect(page.getByText("0 / 13 belge işaretlendi")).toBeVisible();
  await page
    .getByRole("button", {
      name: "7. Çalışma veya gelir durumunu açıklayan belgeler",
      exact: true,
    })
    .click();
  await expect(page.getByText("A. Çalışanlar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Çalışma durumunu seç" }).click();
  await page.getByRole("radio", { name: "Öğrenci", exact: true }).click();
  await expect(
    page.getByText("A. Çalışanlar", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText("D. Çalışmayanlar ve öğrenciler", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true })
    .click();
  await expect(page.getByText("1 / 13 belge işaretlendi")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeChecked();
});
test("password recovery is a focused step, not a permanent fourth mode", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: "Yeni şifre" })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Şifremi unuttum", exact: true })
    .click();
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Şifre", { exact: true })).toHaveCount(0);
});
