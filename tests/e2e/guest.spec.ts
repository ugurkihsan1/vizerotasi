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

test("approved member tips appear in their guide step and invitation document automatically", async ({
  page,
}) => {
  await fixtures(page);
  const appointment = {
    id: "00000000-0000-0000-0000-000000000111",
    title: "Randevu saatinden önce belge kontrolü",
    body: "Randevumda belgelerimin sırasını girişte kontrol ettiler; dosyanı önceden sırala.",
    category_id: "appointment",
  };
  const invitation = {
    id: "00000000-0000-0000-0000-000000000112",
    title: "Davet mektubunu ev sahibinden erken iste",
    body: "Ev sahibimin davet mektubunu hazırlaması zaman aldı; seyahatinden önce hazırlığa başla.",
    category_id: "invitation",
  };
  await page.route("https://*.supabase.co/rest/v1/posts?**", async (route) => {
    const p = new URL(route.request().url()).searchParams;
    expect(p.get("country_id")).toBe("eq.spain");
    expect(p.get("status")).toBe("eq.approved");
    expect(p.get("kind")).toBe("eq.tip");
    expect(p.get("is_sample")).toBe("eq.false");
    const topics = p.get("category_id") ?? "";
    await route.fulfill({
      json: [appointment, invitation].filter((t) =>
        topics.includes(t.category_id),
      ),
    });
  });
  await page.goto("/country/spain");
  await page.getByRole("button", { name: "Rehber", exact: true }).click();
  const appointmentStep = page
    .getByRole("button", { name: "Randevu", exact: true })
    .locator("..");
  await expect(
    appointmentStep.getByRole("button", {
      name: appointment.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    appointmentStep.getByText("Topluluk notu · Randevu", { exact: true }),
  ).toBeVisible();
  await expect(
    appointmentStep.getByRole("button", {
      name: invitation.title,
      exact: true,
    }),
  ).toHaveCount(0);
  await appointmentStep
    .getByRole("button", { name: appointment.title, exact: true })
    .click();
  await expect(
    appointmentStep.getByText(appointment.body, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Konaklama ve davet mektubu", exact: true })
      .locator("..")
      .getByRole("button", { name: invitation.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  const document = page
    .getByRole("checkbox", {
      name: "Konaklama belgeleri: Hazırladım",
      exact: true,
    })
    .locator("../..");
  await expect(
    document.getByRole("button", { name: invitation.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: appointment.title, exact: true }),
  ).toHaveCount(0);
  await document
    .getByRole("button", { name: invitation.title, exact: true })
    .click();
  await document
    .getByRole("link", {
      name: `${invitation.title}: paylaşımı ve yorumları aç`,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/experience/${invitation.id}$`));
});

test("existing member tip starts appearing after approval and disappears after withdrawal", async ({
  page,
}) => {
  await fixtures(page);
  let approved = false;
  const title = "Üyenin daha önce eklediği randevu notu";
  await page.route("https://*.supabase.co/rest/v1/posts?**", async (route) => {
    const p = new URL(route.request().url()).searchParams;
    await route.fulfill({
      json:
        approved && p.get("category_id") === "in.(appointment)"
          ? [
              {
                id: "00000000-0000-0000-0000-000000000113",
                title,
                body: "Daha önce paylaşılan ve şimdi onaylanan gerçek bir randevu notu örneği.",
                category_id: "appointment",
              },
            ]
          : [],
    });
  });
  async function guide() {
    await page.goto("/country/spain");
    await page.getByRole("button", { name: "Rehber", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Konaklama ve davet mektubu",
        exact: true,
      }),
    ).toBeVisible();
  }
  await guide();
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toHaveCount(0);
  approved = true;
  await page.reload();
  await page.getByRole("button", { name: "Rehber", exact: true }).click();
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toBeVisible();
  approved = false;
  await page.reload();
  await page.getByRole("button", { name: "Rehber", exact: true }).click();
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toHaveCount(0);
});

test("a normal member can choose the guide topic and submit a critical note for approval", async ({
  page,
}) => {
  await fixtures(page);
  const user = {
    id: "00000000-0000-0000-0000-000000000200",
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.com",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-10-01T00:00:00Z",
  };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp, aud: "authenticated", role: "authenticated" })).toString("base64url")}.fixture-signature`;
  await page.addInitScript(
    ({ jwt, exp, user }) =>
      localStorage.setItem(
        "sb-ebnkdgvngufxarkwiyxt-auth-token",
        JSON.stringify({
          access_token: jwt,
          refresh_token: "fixture-refresh",
          expires_at: exp,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      ),
    { jwt, exp, user },
  );
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({
      json: {
        id: user.id,
        username: "fixture_member",
        display_name: "Normal member",
        role: "user",
        membership_level: "Yeni Üye",
        reputation: 0,
        created_at: user.created_at,
      },
    }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/forum_categories?**",
    (route) =>
      route.fulfill({
        json: [
          { id: "appointment", name: "Randevu" },
          { id: "invitation", name: "Davet Mektubu" },
          { id: "other", name: "Diğer" },
        ],
      }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?kind=tip&country=spain&category=appointment");
  await expect(
    page.getByText(
      "İspanya rehberindeki Randevu adımında mor topluluk notu olarak görünür.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Davet Mektubu", exact: true })
    .click();
  await expect(
    page.getByText(
      /İspanya rehberindeki Konaklama ve davet mektubu adımında ve Konaklama belgelerinin altında/,
    ),
  ).toBeVisible();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Davet mektubunu erkenden hazırlayın");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Ev sahibimin davet mektubunu hazırlaması zaman aldı; erkenden iletişime geçin.",
    );
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    kind: "tip",
    country_id: "spain",
    category_id: "invitation",
    user_id: user.id,
  });
  expect(submitted).not.toHaveProperty("status");
});

test("all other countries including Norway have source-linked guides and document checklists", async ({
  page,
}) => {
  test.setTimeout(120000);
  await fixtures(page);
  for (const [id, name] of [
    ["germany", "Almanya"],
    ["estonia", "Estonya"],
    ["poland", "Polonya"],
    ["france", "Fransa"],
    ["italy", "İtalya"],
    ["greece", "Yunanistan"],
    ["hungary", "Macaristan"],
    ["netherlands", "Hollanda"],
    ["norway", "Norveç"],
  ]) {
    await page.goto(`/country/${id}`);
    await page.getByRole("button", { name: "Belgeler", exact: true }).click();
    await expect(
      page.getByText(`${name} · Turistik vize belgeleri`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("0 / 13 belge işaretlendi", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
    ).toBeAttached();
    await page.getByRole("button", { name: "Rehber", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Randevu", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Başvuru zamanı ve işlem süresi",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Avrupa Komisyonu – Schengen vizesine başvuru",
        exact: true,
      }),
    ).toBeAttached();
  }
});

test("Norway highlights its actual translation rule and keeps document checkmarks", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/country/norway");
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Tercüme ve dosya biçimini kontrol et",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      /Türkiye kontrol listesi bütün belgelerin İngilizce veya Norveççe olmasını/,
    ),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true })
    .click();
  await expect(
    page.getByText("1 / 13 belge işaretlendi", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeChecked();
});
