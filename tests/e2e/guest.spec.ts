import { test, expect, type Page } from "@playwright/test";
import levels from "../../src/content/community-levels.json";
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
    if (u.pathname === "/rest/v1/rpc/country_stats")
      return route.fulfill({
        json: [
          {
            experiences: 0,
            questions: 0,
            tips: 0,
            average_days: null,
            recent: 0,
          },
        ],
      });
    if (u.pathname === "/rest/v1/membership_levels")
      return route.fulfill({ json: levels });
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

test("badge levels explain all quality gates and separate achievements", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/badges");
  for (const name of [
    "Gezgin",
    "Kaşif",
    "Seyyah",
    "Rehber",
    "Elçi",
    "Büyükelçi",
  ])
    await expect(
      page.getByRole("button", { name: `${name} koşulları`, exact: true }),
    ).toBeVisible();
  for (const name of ["Avrupa Fatihi", "Yol Arkadaşı", "Dedektif", "Öncü Üye"])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Büyükelçi koşulları", exact: true })
    .click();
  await expect(
    page.getByText("Farklı destekleyen üye", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Üyelik günü", { exact: true })).toBeVisible();
});
test("critical document notices expand and do not invent community evidence", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/country/spain");
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  const notice = page.getByRole("button", {
    name: "Sigortanın süresini ve teminatını kontrol et",
    exact: true,
  });
  await expect(notice).toHaveAttribute("aria-expanded", "false");
  await notice.click();
  await expect(notice).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText(/BLS İstanbul listesi: seyahatten 1 gün önce/),
  ).toBeVisible();
  await expect(page.getByText(/kişi benzer deneyim bildirdi/)).toHaveCount(0);
  await expect(page.getByText("Demo", { exact: true })).toHaveCount(0);
});
