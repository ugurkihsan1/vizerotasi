import countryGuideFixtures from "../../src/content/country-guides.json";
import spainFixture from "../../src/content/spain-tourism.json";
import { test, expect, type Page } from "@playwright/test";
import levels from "../../src/content/community-levels.json";
// Deterministic UI tests use transport fixtures only; the shipped app uses real Supabase.
async function fixtures(page: Page, firstVisit = false) {
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  if (!firstVisit)
    await page.addInitScript(() =>
      localStorage.setItem("onboarding-planner-v1", "done"),
    );
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
  await expect(page.getByText("İlk deneyim senden olsun")).toBeVisible();
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
  await fillSignup(page);
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
  await page
    .getByRole("button", { name: "Liste seçenekleri ve kaynaklar" })
    .click();
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
  const insurance = {
    id: "00000000-0000-0000-0000-000000000113",
    title: "Sigorta poliçesini önceden kontrol et",
    body: "Poliçemdeki seyahat tarihlerini başvuru öncesinde tekrar kontrol ettim.",
    category_id: "doc-insurance",
  };
  await page.route("https://*.supabase.co/rest/v1/posts?**", async (route) => {
    const p = new URL(route.request().url()).searchParams;
    expect(p.get("country_id")).toBe("eq.spain");
    expect(p.get("status")).toBe("eq.approved");
    expect(p.get("kind")).toBe("eq.tip");
    expect(p.get("is_sample")).toBe("eq.false");
    const topics = p.get("category_id") ?? "";
    await route.fulfill({
      json: [appointment, invitation, insurance].filter((t) =>
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
  const insuranceDocument = page
    .getByRole("checkbox", { name: /seyahat sağlık sigortası.*Hazırladım/i })
    .locator("../..");
  await expect(
    insuranceDocument.getByRole("button", {
      name: insurance.title,
      exact: true,
    }),
  ).toBeVisible();
  await insuranceDocument
    .getByRole("button", { name: insurance.title, exact: true })
    .click();
  await expect(
    insuranceDocument.getByText(insurance.body, { exact: true }),
  ).toBeVisible();
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
  await page
    .getByRole("button", { name: "Topluluk notu nerede görünür?", exact: true })
    .click();
  await expect(
    page.getByText(
      "İspanya rehberindeki Randevu adımında topluluk notu olarak görünür.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await page
    .getByRole("button", { name: "Davet mektubu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Topluluk notu nerede görünür?", exact: true })
    .click();
  await expect(
    page.getByText(
      /İspanya rehberindeki Konaklama ve davet mektubu adımında ve Konaklama belgelerinin altında/,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
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
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
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
    await page
      .getByRole("button", { name: "Resmî kaynaklar", exact: true })
      .click();
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

test("all ten country cards load bundled landmark photographs and expose photo credits", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/discover");
  const landmarks = [
    "Brandenburg Kapısı, Berlin",
    "Tallinn Eski Şehir",
    "Ana Pazar Meydanı, Kraków",
    "Eyfel Kulesi, Paris",
    "Kolezyum, Roma",
    "Partenon, Atina",
    "Parlamento Binası, Budapeşte",
    "Prinsengracht Kanalı, Amsterdam",
    "Sagrada Família, Barselona",
    "Geiranger Fiyordu",
  ];
  for (const landmark of landmarks) {
    const photo = page
      .getByRole("link", { name: /topluluğu(?:, takip ediliyor)?$/ })
      .getByRole("img", { name: landmark, exact: true });
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    expect(await photo.getAttribute("src")).not.toMatch(
      /^https:\/\/(upload|thumb)\.wikimedia/,
    );
    expect(await photo.getAttribute("src")).not.toContain("data:image/svg");
  }
  await page
    .getByRole("link", { name: "Fransa topluluğu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fotoğraf bilgisi ve kaynak", exact: true })
    .click();
  await expect(page).toHaveURL(/\/photo-credits\?country=france$/);
  await expect(
    page.getByText("Fotoğraf: Pointois", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fotoğraf lisansı", exact: true }),
  ).toBeVisible();
});

async function member(page: Page) {
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
}

test("document subtypes submit a precise country-guide category", async ({
  page,
}) => {
  await member(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?kind=tip&country=spain");
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await page
    .getByRole("button", { name: "Belge türünü seç", exact: true })
    .click();
  await page.getByRole("radio", { name: /seyahat sağlık sigortası/i }).click();
  await expect(
    page.getByText("İspanya → Yurtdışı seyahat sağlık sigortası", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Sigorta belgesindeki imza");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Sigorta belgesini hazırlarken başvuru merkezinin güncel belge listesini kontrol ettim.",
    );
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    country_id: "spain",
    category_id: "doc-insurance",
    kind: "tip",
  });
});

test("experience accepts optional narrative, visa history and invitation notes without calendar dates", async ({
  page,
}) => {
  await member(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?country=spain");
  await page
    .getByRole("button", { name: "Vize başvurusu deneyimi", exact: true })
    .click();
  await page.getByLabel("Başvuru şehri", { exact: true }).fill("İstanbul");
  await page.getByLabel("Başvuru merkezi", { exact: true }).fill("BLS");
  await page
    .getByRole("button", { name: "Kültürel etkinlik", exact: true })
    .click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page
    .getByRole("switch", { name: "İlk Schengen vizem", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Önceki vize ekle", exact: true })
    .click();
  await page.getByLabel("Vizeyi veren ülke", { exact: true }).fill("Fransa");
  await page
    .getByLabel("Vize süresi (ör. 6 ay, 1 yıl) · isteğe bağlı", { exact: true })
    .fill("6 ay");
  await page
    .getByLabel("Davetiye durumunu açıkla (isteğe bağlı)", { exact: true })
    .fill("Kültür etkinliği davetiyem e-posta ile geldi.");
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await expect(
    page.getByLabel("Başvuru tarihi · gün", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Kültürel etkinlik başvurum");
  await expect(
    page.getByLabel("Başvuru sürecinde neler yaşadın? (isteğe bağlı)", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    body: "",
    application_date: null,
    processing_days: null,
    purpose: "Kültürel etkinlik",
    first_schengen: false,
    previous_visas: [
      expect.objectContaining({ country: "Fransa", duration: "6 ay" }),
    ],
    invitation_notes: "Kültür etkinliği davetiyem e-posta ile geldi.",
  });
});

test("experience result wraps the card top and Germany uses a rendered flag", async ({
  page,
}) => {
  await fixtures(page);
  const base = {
    id: "00000000-0000-0000-0000-000000000444",
    user_id: "00000000-0000-0000-0000-000000000200",
    country_id: "germany",
    kind: "experience",
    title: "Almanya kültür başvurum",
    body: "",
    status: "approved",
    created_at: "2026-10-22T10:00:00Z",
    helpful_count: 0,
    comment_count: 0,
    is_sample: false,
    result: "approved",
    application_date: "2026-10-01",
    decision_date: "2026-10-21",
    source_type: "experience",
  };
  await page.route("https://*.supabase.co/rest/v1/countries?**", (route) =>
    route.fulfill({
      json: [{ id: "germany", name: "Almanya", flag: "🇩🇪", code: "DE" }],
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/feed?**", (route) =>
    route.fulfill({ json: [base] }),
  );
  await page.addInitScript(() => localStorage.setItem("onboarding-v1", "done"));
  await page.goto("/");
  const flag = page.getByRole("img", {
    name: "Almanya bayrağı 🇩🇪",
    exact: true,
  });
  await expect(flag).toBeVisible();
  await expect(flag).toHaveAttribute("src", /^data:image\/svg/);
  const cap = page.getByText("✓ Onaylandı", { exact: true }).locator("..");
  await expect(cap).toHaveCSS("background-color", "rgb(205, 236, 217)");
  const card = cap.locator("..");
  expect(
    await cap.evaluate((el) => el.parentElement?.firstElementChild === el),
  ).toBe(true);
  const capBox = await cap.boundingBox(),
    cardBox = await card.boundingBox();
  expect(Math.abs(capBox!.width - cardBox!.width)).toBeLessThan(3);
  await page.screenshot({ path: "/tmp/forms-card-mobile.png" });
  await expect(page.getByText("22/10/2026", { exact: false })).toHaveCount(0);
});

test("signup photo stays local through email confirmation and uploads only after login", async ({
  page,
}) => {
  await fixtures(page);
  const id = "00000000-0000-0000-0000-000000000200";
  await page.route("https://*.supabase.co/auth/v1/signup**", (route) =>
    route.fulfill({
      json: {
        id,
        aud: "authenticated",
        role: "authenticated",
        email: "photo-fixture@example.com",
        identities: [],
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-10-22T00:00:00Z",
      },
    }),
  );
  let uploads = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/storage/v1/object/avatars/")
    )
      uploads++;
  });
  await page.goto("/auth?mode=signup");
  await page
    .getByLabel("E-posta", { exact: true })
    .fill("photo-fixture@example.com");
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("photo_fixture");
  await page
    .getByLabel("Şifre · en az 8 karakter", { exact: true })
    .fill("Test1234");
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", {
      name: "Profil fotoğrafı ekle (isteğe bağlı)",
      exact: true,
    })
    .click();
  await (await chooser).setFiles("assets/destinations/france.jpg");
  await expect(
    page.getByRole("img", { name: "Seçilen profil fotoğrafı", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Adınız", { exact: true }).fill("Fotoğraf Yolcu");
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
  await page
    .getByRole("button", { name: "Hesabımı oluştur", exact: true })
    .click();
  await expect(
    page.getByText(/Doğrulama bağlantısını e-postana gönderdik/),
  ).toBeVisible();
  expect(uploads).toBe(0);
  const key = `pending-signup-avatar:v1:${id}`;
  expect(await page.evaluate((key) => !!localStorage.getItem(key), key)).toBe(
    true,
  );
  await member(page);
  await page.route(
    "https://*.supabase.co/storage/v1/object/avatars/**",
    (route) => {
      expect(new URL(route.request().url()).pathname).toContain(
        `/avatars/${id}/`,
      );
      return route.fulfill({ json: { Key: "avatars/fixture.jpg" } });
    },
  );
  let photoSaved = false;
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) => {
    if (route.request().method() === "PATCH") {
      expect(route.request().postDataJSON().avatar_url).toContain(
        `/avatars/${id}/`,
      );
      photoSaved = true;
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({
      json: {
        id,
        username: "photo_fixture",
        display_name: "Fotoğraf Yolcu",
        role: "user",
        membership_level: "Yeni Üye",
        reputation: 0,
      },
    });
  });
  await page.goto("/settings");
  await expect.poll(() => photoSaved).toBe(true);
  expect(uploads).toBe(1);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), key))
    .toBe(null);
});

test("first visit asks about plans and booked applicants can open a persistent document checklist", async ({
  page,
}) => {
  await fixtures(page, true);
  await page.addInitScript(() => localStorage.setItem("onboarding-v1", "done"));
  await page.goto("/");
  await expect(
    page.getByText("Yakında bir randevu ya da seyahat planın var mı?", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Devam", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("radio", { name: "Randevumu aldım", exact: true })
    .click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await expect(
    page.getByText("Hangi ülke için randevu aldın?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Devam", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "İspanya", exact: true }).click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await expect(
    page.getByText("Randevun hazır. Peki belgelerin?", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/planner-booked-mobile.png" });
  await page
    .getByRole("button", { name: "Belge checklistine git", exact: true })
    .click();
  await expect(page).toHaveURL(/\/country\/spain\?/);
  expect(new URL(page.url()).searchParams.get("tab")).toBe("Belgeler");
  await expect(
    page.getByText("0 / 13 belge işaretlendi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true })
    .click();
  await expect(
    page.getByText("1 / 13 belge işaretlendi", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeChecked();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travel-plan:v1")!),
    ),
  ).toEqual({ status: "booked", country_id: "spain" });
  await page.goto("/");
  await expect(page.getByText("İlk deneyim senden olsun")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Randevumu aldım", exact: true }),
  ).toHaveCount(0);
});

for (const scenario of [
  {
    choice: "Randevu almayı planlıyorum",
    question: "Hangi ülke için randevu alacaksın?",
    country: "Almanya",
    id: "germany",
    status: "appointment",
  },
  {
    choice: "Seyahat planlıyorum",
    question: "Hangi ülkeye seyahat etmeyi planlıyorsun?",
    country: "Norveç",
    id: "norway",
    status: "travel",
  },
])
  test(`first visit guides ${scenario.status} plans to the selected country's guide`, async ({
    page,
  }) => {
    await fixtures(page, true);
    await page.goto("/");
    await page
      .getByRole("radio", { name: scenario.choice, exact: true })
      .click();
    await page.getByRole("button", { name: "Devam", exact: true }).click();
    await expect(
      page.getByText(scenario.question, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("radio", { name: scenario.country, exact: true })
      .click();
    await page.getByRole("button", { name: "Devam", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Belge checklistine git", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Ülke rehberine git", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/country/${scenario.id}\\?`));
    expect(new URL(page.url()).searchParams.get("tab")).toBe("Rehber");
    await expect(
      page.getByText("Resmî kaynaklar", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("travel-plan:v1")!),
      ),
    ).toEqual({ status: scenario.status, country_id: scenario.id });
  });

test("visitors can skip planning or explore without a plan and are not asked again", async ({
  page,
}) => {
  await fixtures(page, true);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Şimdilik atla", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Randevumu aldım", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("İlk deneyim senden olsun")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Randevumu aldım", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem("onboarding-planner-v1"));
  await page.reload();
  await page
    .getByRole("radio", { name: "Şimdilik bir planım yok", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Topluluğu keşfet", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Randevumu aldım", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travel-plan:v1")!),
    ),
  ).toEqual({ status: "none", country_id: null });
});

test("sharing scales to 35 countries with a searchable picker and placeholders never become content", async ({
  page,
}) => {
  await member(page);
  const guides = countryGuideFixtures;
  const countries = [
    { id: "spain", name: "İspanya", code: "ES", flag: "🇪🇸" },
    ...guides.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      flag: c.flag,
    })),
    ...Array.from({ length: 34 - guides.length }, (_, i) => ({
      id: `future-${i}`,
      name: i === 33 - guides.length ? "Lüksemburg" : `Test ülkesi ${i}`,
      code: "LU",
      flag: "🇱🇺",
    })),
  ];
  expect(countries).toHaveLength(35);
  await page.route("https://*.supabase.co/rest/v1/countries?**", (route) =>
    route.fulfill({ json: countries }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?kind=question");
  await expect(
    page.getByRole("radio", { name: "Lüksemburg", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Başvuru ülkesi: Ülke seç", exact: true })
    .click();
  await page.getByLabel("Ülke ara", { exact: true }).fill("lüksem");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await page.getByRole("radio", { name: "Lüksemburg", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Başvuru ülkesi: Lüksemburg",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Sorunun başlığı", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Sorunun başlığı", { exact: true }),
  ).toHaveAttribute("placeholder", /Örn\./);
  await page
    .getByLabel("Sorunun başlığı", { exact: true })
    .fill("Güncel randevu sürecini soruyorum");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Randevu hazırlığında hangi adımları izlediğinizi öğrenmek istiyorum.",
    );
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    country_id: `future-${33 - guides.length}`,
    title: "Güncel randevu sürecini soruyorum",
  });
  expect(JSON.stringify(submitted)).not.toContain("Örn.");
});

test("multiple private evidence files accompany one post and show the exact insurance destination", async ({
  page,
}) => {
  await member(page);
  const id = "00000000-0000-0000-0000-000000000880";
  const writes: string[] = [];
  let posts = 0;
  await page.route("https://*.supabase.co/rest/v1/posts?**", (route) => {
    posts++;
    return route.fulfill({ status: 201, json: { id } });
  });
  await page.route(
    "https://*.supabase.co/storage/v1/object/post-evidence/**",
    (route) => {
      writes.push(new URL(route.request().url()).pathname);
      return route.fulfill({ json: { Key: "private-fixture" } });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/register_post_evidence",
    (route) => {
      const body = route.request().postDataJSON();
      expect(body.target).toBe(id);
      expect(body.path).toContain(`/` + id + `/`);
      return route.fulfill({ json: "00000000-0000-0000-0000-000000000881" });
    },
  );
  await page.goto("/create?kind=tip&country=spain&category=doc-insurance");
  await expect(
    page.getByText("İspanya → Yurtdışı seyahat sağlık sigortası", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Sadece sen ve yönetim görür · Kişisel bilgileri gizle.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Sigortada ıslak imza istendi");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Başvurumda sigorta poliçemin ıslak imzalı nüshasını istediler. Tarihler belgemde görünüyor.",
    );
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Destekleyici belgeleri seç", exact: true })
    .click();
  const pdf = Buffer.from(
    "%PDF-1.4\n% Sanitized, fictional UI test document, not a real policy\n%%EOF",
  );
  await (
    await chooser
  ).setFiles([
    { name: "redacted-policy.pdf", mimeType: "application/pdf", buffer: pdf },
    { name: "redacted-ticket.pdf", mimeType: "application/pdf", buffer: pdf },
  ]);
  await expect(
    page.getByRole("button", {
      name: "redacted-policy.pdf dosyasını kaldır",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/critical-private-evidence-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(posts).toBe(1);
  expect(writes).toHaveLength(2);
  expect(writes[0]).not.toBe(writes[1]);
});

test("staff reviews private evidence separately from publication and sees the verified experience label", async ({
  page,
}) => {
  await member(page);
  const id = "00000000-0000-0000-0000-000000000882";
  const post = {
    id,
    user_id: "00000000-0000-0000-0000-000000000300",
    country_id: "germany",
    kind: "tip",
    category_id: "doc-insurance",
    title: "Poliçemde ıslak imza istendi",
    body: "Başvurumda ıslak imzalı sigorta poliçesi istendi; ilgili alanları kapattım.",
    status: "approved",
    created_at: "2026-10-22T10:00:00Z",
    is_sample: false,
    helpful_count: 0,
    comment_count: 0,
    source_type: "submission",
  };
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-0000-0000-000000000200",
        username: "reviewer",
        display_name: "Reviewer",
        role: "moderator",
        membership_level: "Öncü Üye",
        reputation: 0,
      },
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/feed?**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has("id") ? post : [],
    }),
  );
  let verified = false,
    decisions = 0;
  await page.route(
    "https://*.supabase.co/rest/v1/post_verifications?**",
    (route) =>
      route.fulfill({
        json: new URL(route.request().url()).searchParams.has("post_id")
          ? {
              post_id: id,
              status: verified ? "verified" : "pending",
              verified_at: null,
            }
          : verified
            ? []
            : [{ post_id: id }],
      }),
  );
  await page.route("https://*.supabase.co/rest/v1/post_evidence?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "00000000-0000-0000-0000-000000000883",
          post_id: id,
          file_name: "redacted-policy.pdf",
          mime_type: "application/pdf",
          size_bytes: 1000,
          storage_path: `private-owner/${id}/file.pdf`,
        },
      ],
    }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/review_post_evidence",
    (route) => {
      decisions++;
      expect(route.request().postDataJSON()).toMatchObject({
        target: id,
        decision: "verified",
        internal_note: "Tarih ve ilgili belge alanı kontrol edildi.",
      });
      verified = true;
      return route.fulfill({ status: 204, body: "" });
    },
  );
  await page.goto("/moderation");
  await expect(
    page.getByRole("button", {
      name: "redacted-policy.pdf belgesini indir",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Belgeleri yeterli buldum · Doğrula",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Özel belge inceleme notu", { exact: true })
    .fill("Tarih ve ilgili belge alanı kontrol edildi.");
  await page
    .getByRole("button", { name: "Belge kararını kaydet", exact: true })
    .click();
  await expect.poll(() => decisions).toBe(1);
  await expect(
    page.getByText("İnceleme bekleyen belge yok.", { exact: true }),
  ).toBeVisible();
});

test("insurance community notes stay under insurance and publication never implies an official rule", async ({
  page,
}) => {
  await fixtures(page);
  const id = "00000000-0000-0000-0000-000000000884";
  await page.route("https://*.supabase.co/rest/v1/posts?**", (route) =>
    route.fulfill({
      json: (
        new URL(route.request().url()).searchParams.get("category_id") ?? ""
      ).includes("doc-insurance")
        ? [
            {
              id,
              title: "Islak imzalı sigorta poliçesi istendi",
              body: "Bu yalnız benim başvurumda yaşadığım bir deneyimdir.",
              category_id: "doc-insurance",
            },
          ]
        : [],
    }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/post_verifications?**",
    (route) =>
      route.fulfill({
        json: {
          post_id: id,
          status: "verified",
          verified_at: "2026-10-23T12:00:00Z",
        },
      }),
  );
  await page.goto("/country/germany?tab=Belgeler");
  const insurance = page
    .getByRole("checkbox", { name: /Seyahat sağlık sigortası: Hazırladım/i })
    .locator("../..");
  await insurance
    .getByRole("button", {
      name: "Islak imzalı sigorta poliçesi istendi",
      exact: true,
    })
    .click();
  await expect(
    insurance.getByText("✓ Belgeyle doğrulanmış deneyim", { exact: true }),
  ).toBeVisible();
  await expect(
    insurance.getByText("Kişisel deneyim · Resmî kural değil", { exact: true }),
  ).toBeVisible();
  const finance = page
    .getByRole("checkbox", { name: /Maddi durum.*Hazırladım/i })
    .locator("../..");
  await expect(
    finance.getByRole("button", {
      name: "Islak imzalı sigorta poliçesi istendi",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("home keeps the community feed and adds the visitor's plan and real checklist progress", async ({
  page,
}) => {
  await fixtures(page);
  await page.addInitScript(
    ({ id }) => {
      localStorage.setItem(
        "travel-plan:v1",
        JSON.stringify({ status: "booked", country_id: "spain" }),
      );
      localStorage.setItem(
        "spain-tourism-checklist:v1:guest",
        JSON.stringify([id]),
      );
      localStorage.setItem(
        "guest-country-interests",
        JSON.stringify(["spain", "france"]),
      );
    },
    { id: spainFixture.documents[0].id },
  );
  await page.goto("/");
  await expect(page.getByText("Randevu alındı", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1/13 belge hazır", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Belge hazırlığı" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await expect(
    page.getByText("Takip ettiğin ülkeler:", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Deneyimler", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Belgelerime devam et · İspanya · 1/13 belge hazır",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeChecked();
});

test("a failed private upload can be retried without duplicating the public contribution", async ({
  page,
}) => {
  await member(page);
  const id = "00000000-0000-0000-0000-000000000889";
  let posts = 0,
    uploads = 0;
  await page.route("https://*.supabase.co/rest/v1/posts?**", (route) => {
    posts++;
    return route.fulfill({ status: 201, json: { id } });
  });
  await page.route(
    "https://*.supabase.co/storage/v1/object/post-evidence/**",
    (route) => {
      uploads++;
      return uploads === 1
        ? route.fulfill({
            status: 503,
            json: { message: "Fixture temporary upload error" },
          })
        : route.fulfill({ json: { Key: "private-fixture" } });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/register_post_evidence",
    (route) => route.fulfill({ json: "00000000-0000-0000-0000-000000000890" }),
  );
  await page.goto("/create?kind=tip&country=spain&category=doc-insurance");
  await page
    .getByRole("button", { name: "Topluluk notu nerede görünür?", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/critical-destination-mobile.png" });
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Poliçemde tarih kontrolü");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill("Başvurumda seyahat tarihlerimin poliçede görünmesini istediler.");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Destekleyici belgeleri seç", exact: true })
    .click();
  await (
    await chooser
  ).setFiles([
    {
      name: "redacted.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%fictional fixture\n%%EOF"),
    },
  ]);
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Paylaşımın kaydedildi", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kalan belgeleri yükle", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Kalan belgeleri yükle", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(posts).toBe(1);
  expect(uploads).toBe(2);
});

test("search finds experiences, critical tips and questions with country-aware filters", async ({
  page,
}) => {
  await fixtures(page);
  const base = {
    user_id: "00000000-0000-0000-0000-000000000200",
    status: "approved",
    created_at: "2026-10-22T10:00:00Z",
    body: "Seyahat sağlık sigortası ile ilgili gerçek bir topluluk test paylaşımı.",
    helpful_count: 0,
    comment_count: 0,
    is_sample: false,
    source_type: "submission",
  };
  const posts = [
    {
      ...base,
      id: "search-exp",
      kind: "experience",
      country_id: "germany",
      title: "Sigorta deneyimim",
      result: "approved",
    },
    {
      ...base,
      id: "search-tip",
      kind: "tip",
      country_id: "france",
      title: "Poliçede ıslak imza notum",
    },
    {
      ...base,
      id: "search-question",
      kind: "question",
      country_id: "germany",
      title: "Sigortayla ilgili sorum",
    },
  ];
  const requests: URL[] = [];
  await page.route("https://*.supabase.co/rest/v1/feed?**", (route) => {
    const u = new URL(route.request().url());
    requests.push(u);
    expect(u.searchParams.get("status")).toBe("eq.approved");
    const kind = u.searchParams.get("kind"),
      country = u.searchParams.get("country_id");
    return route.fulfill({
      json: posts.filter(
        (p) =>
          (!kind || kind === `eq.${p.kind}`) &&
          (!country || country.includes(p.country_id)),
      ),
    });
  });
  await page.goto("/discover?q=sigorta");
  await expect(
    page.getByText("Sigorta deneyimim", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Poliçede ıslak imza notum", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sigortayla ilgili sorum", { exact: true }),
  ).toBeVisible();
  expect(requests.at(-1)?.searchParams.get("or")).toContain(
    "title.ilike.%sigorta%",
  );
  await page
    .getByRole("button", { name: "Önemli bilgiler", exact: true })
    .click();
  await expect(
    page.getByText("Poliçede ıslak imza notum", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sigorta deneyimim", { exact: true }),
  ).toHaveCount(0);
  expect(requests.at(-1)?.searchParams.get("kind")).toBe("eq.tip");
  await page.getByRole("button", { name: "Sorular", exact: true }).click();
  await expect(
    page.getByText("Sigortayla ilgili sorum", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tümü", exact: true }).click();
  await page
    .getByLabel("Ülke, belge, deneyim veya soru ara", { exact: true })
    .fill("Almanya sigorta");
  await expect(
    page.getByText("Ülke: Almanya · Konu: sigorta", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Poliçede ıslak imza notum", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Sigorta deneyimim", { exact: true }),
  ).toBeVisible();
  expect(requests.at(-1)?.searchParams.get("country_id")).toBe("in.(germany)");
  await page.screenshot({ path: "/tmp/search-community-mobile.png" });
  await page
    .getByLabel("Ülke, belge, deneyim veya soru ara", { exact: true })
    .fill("Almanya");
  await expect.poll(() => requests.at(-1)?.searchParams.get("or")).toBeNull();
  await expect(
    page.getByText("Sigorta deneyimim", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ülkeler", exact: true }).click();
  await page
    .getByRole("link", { name: "Almanya topluluğu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/country\/germany$/);
});

test("document search names every country and opens its own checklist", async ({
  page,
}) => {
  await fixtures(page);
  await page.route(
    "https://*.supabase.co/rest/v1/country_documents?**",
    (route) =>
      route.fulfill({
        json: [
          {
            id: "search-insurance-de",
            country_id: "germany",
            title: "Seyahat sağlık sigortası",
            body: "Almanya sigorta başvuru belgesi.",
          },
          {
            id: "search-insurance-fr",
            country_id: "france",
            title: "Seyahat sağlık sigortası",
            body: "Fransa sigorta başvuru belgesi.",
          },
        ],
      }),
  );
  await page.goto("/discover?q=sigorta");
  await expect(
    page.getByRole("button", {
      name: "Almanya · Seyahat sağlık sigortası",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Almanya · Seyahat sağlık sigortası",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Fransa · Seyahat sağlık sigortası",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/search-documents-mobile.png" });
  await page
    .getByRole("button", {
      name: "Fransa · Seyahat sağlık sigortası",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Fransa belge checklistine git", exact: true })
    .click();
  await expect(page).toHaveURL(/\/country\/france\?/);
  expect(new URL(page.url()).searchParams.get("tab")).toBe("Belgeler");
});

async function chatFixtures(
  page: Page,
  options: { kind?: "direct" | "group" | "community"; invited?: boolean } = {},
) {
  await member(page);
  const own = "00000000-0000-0000-0000-000000000200",
    peer = "00000000-0000-0000-0000-000000000300",
    third = "00000000-0000-0000-0000-000000000301",
    id = "00000000-0000-0000-0000-000000000900";
  const profile = (who: string) => ({
    id: who,
    username: who === own ? "fixture_member" : who === peer ? "deniz" : "ece",
    display_name: who === own ? "Test Yolcu" : who === peer ? "Deniz" : "Ece",
    avatar_url: null,
    role: "user",
    membership_level: "Öncü Üye",
    reputation: 0,
  });
  const state = {
    kind: options.kind ?? ("direct" as "direct" | "group" | "community"),
    invited: options.invited ?? false,
    created: [] as Record<string, unknown>[],
    sends: [] as Record<string, unknown>[],
    messages: [] as Record<string, unknown>[],
    failSend: false,
    read: 0,
    followed: false,
  };
  const room = () => ({
    id,
    kind: state.kind,
    country_id: state.kind === "community" ? "spain" : null,
    title:
      state.kind === "group"
        ? "Yol arkadaşları"
        : state.kind === "community"
          ? "İspanya topluluğu"
          : "",
    created_by: options.invited ? peer : own,
    closed_at: null,
  });
  const members = () => [
    {
      user_id: own,
      status: state.invited ? "invited" : "active",
      invited_by: options.invited ? peer : own,
      joined_at: "2026-10-27T09:00:00Z",
      last_read_at: "2026-10-27T09:00:00Z",
      profiles: profile(own),
    },
    ...(!state.invited && state.kind !== "community"
      ? [
          {
            user_id: peer,
            status: "active",
            invited_by: own,
            joined_at: "2026-10-27T09:00:00Z",
            last_read_at: "2026-10-27T09:00:00Z",
            profiles: profile(peer),
          },
        ]
      : []),
  ];
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) => {
    const uid = new URL(route.request().url()).searchParams.get("id");
    return route.fulfill({
      json: uid?.startsWith("neq.")
        ? [profile(peer), profile(third)]
        : profile(uid?.slice(3) ?? own),
    });
  });
  await page.route(
    "https://*.supabase.co/rest/v1/followed_countries?**",
    (route) =>
      route.fulfill({ json: state.followed ? [{ country_id: "spain" }] : [] }),
  );
  await page.route("https://*.supabase.co/rest/v1/chat_rooms?**", (route) =>
    route.fulfill({ json: room() }),
  );
  await page.route("https://*.supabase.co/rest/v1/chat_members?**", (route) =>
    route.fulfill({ json: members() }),
  );
  await page.route("https://*.supabase.co/rest/v1/chat_messages?**", (route) =>
    route.fulfill({ json: [...state.messages].reverse() }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_unread_count",
    (route) => route.fulfill({ json: 0 }),
  );
  await page.route("https://*.supabase.co/rest/v1/rpc/chat_inbox", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_create_private",
    (route) => {
      const data = route.request().postDataJSON();
      state.created.push(data);
      state.kind = data.recipients.length > 1 ? "group" : "direct";
      return route.fulfill({ json: id });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_open_community",
    (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        target_country: "spain",
        follow_country: true,
      });
      state.followed = true;
      state.kind = "community";
      return route.fulfill({ json: id });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_answer_invite",
    (route) => {
      state.invited = false;
      return route.fulfill({ status: 204, body: "" });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_mark_read",
    (route) => {
      state.read++;
      return route.fulfill({ status: 204, body: "" });
    },
  );
  await page.route("https://*.supabase.co/rest/v1/rpc/chat_send", (route) => {
    const data = route.request().postDataJSON();
    state.sends.push(data);
    if (state.failSend) {
      state.failSend = false;
      return route.fulfill({
        status: 503,
        json: { message: "Fixture temporary error" },
      });
    }
    state.messages.push({
      id: data.client_id,
      room_id: id,
      sender_id: own,
      body: data.message_body,
      created_at: new Date().toISOString(),
      hidden_at: null,
      profiles: profile(own),
    });
    return route.fulfill({ json: data.client_id });
  });
  return { state, own, peer, third, id, profile };
}

test("members create a direct chat and safely retry a failed message without changing its id", async ({
  page,
}) => {
  const { state, peer } = await chatFixtures(page);
  await page.goto("/messages");
  await page
    .getByRole("button", { name: "Yeni sohbet / Grup kur", exact: true })
    .click();
  await page.getByLabel("Kişi ara", { exact: true }).fill("deniz");
  await page.getByRole("checkbox", { name: "@deniz", exact: true }).click();
  await page.getByRole("button", { name: "Sohbeti aç", exact: true }).click();
  await expect(page.getByLabel("Mesajın", { exact: true })).toBeVisible();
  expect(state.created).toEqual([{ recipients: [peer], room_title: "" }]);
  state.failSend = true;
  await page
    .getByLabel("Mesajın", { exact: true })
    .fill("Merhaba, randevu hazırlığın nasıl gidiyor?");
  await page.getByRole("button", { name: "Mesaj gönder", exact: true }).click();
  await expect(
    page.getByText(
      "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mesaj gönder", exact: true }).click();
  await expect(
    page.getByText("Merhaba, randevu hazırlığın nasıl gidiyor?", {
      exact: true,
    }),
  ).toBeVisible();
  expect(state.sends).toHaveLength(2);
  expect(state.sends[0].client_id).toBe(state.sends[1].client_id);
  expect(state.messages).toHaveLength(1);
  await expect(page.getByLabel("Mesajın", { exact: true })).toHaveValue("");
  await page.screenshot({ path: "/tmp/chat-direct-mobile.png" });
});

test("a private invitation hides all messages until explicitly accepted", async ({
  page,
}) => {
  const { state, id, peer, profile } = await chatFixtures(page, {
    invited: true,
  });
  state.messages.push({
    id: "00000000-0000-0000-0000-000000000901",
    room_id: id,
    sender_id: peer,
    body: "Kabulden sonra görülen özel mesaj",
    created_at: "2026-10-27T09:05:00Z",
    hidden_at: null,
    profiles: profile(peer),
  });
  await page.goto(`/chat/${id}`);
  await expect(
    page.getByRole("button", { name: "Sohbet isteğini kabul et", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Kabulden sonra görülen özel mesaj", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Mesajın", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sohbet isteğini kabul et", exact: true })
    .click();
  await expect(
    page.getByText("Kabulden sonra görülen özel mesaj", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => state.read).toBeGreaterThan(0);
});

test("members can select multiple people and create a named private group", async ({
  page,
}) => {
  const { state, peer, third } = await chatFixtures(page);
  await page.goto("/messages");
  await page
    .getByRole("button", { name: "Yeni sohbet / Grup kur", exact: true })
    .click();
  await page.getByLabel("Kişi ara", { exact: true }).fill("de");
  await page.getByRole("checkbox", { name: "@deniz", exact: true }).click();
  await page.getByRole("checkbox", { name: "@ece", exact: true }).click();
  await page.getByLabel("Grup adı", { exact: true }).fill("Yol arkadaşları");
  await page
    .getByRole("button", { name: "Grup daveti gönder", exact: true })
    .click();
  await expect(page.getByLabel("Mesajın", { exact: true })).toBeVisible();
  expect(state.created).toEqual([
    { recipients: [peer, third], room_title: "Yol arkadaşları" },
  ]);
});

test("country chat explains and confirms following before opening the community room", async ({
  page,
}) => {
  const { state } = await chatFixtures(page, { kind: "community" });
  await page.goto("/country/spain");
  await page
    .getByRole("button", { name: "Topluluk sohbeti", exact: true })
    .click();
  await expect(
    page.getByText(/Katılınca ülkeyi takip edeceksin/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Takip et ve sohbeti aç", exact: true })
    .click();
  await expect(page.getByLabel("Mesajın", { exact: true })).toBeVisible();
  expect(state.followed).toBe(true);
  await expect(
    page.getByText("Takip eden üyelere açık topluluk odası", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sohbet bilgileri", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/chat-community-empty-mobile.png" });
});

test("chat participants can report a single message and block its sender", async ({
  page,
}) => {
  const { state, id, peer, profile } = await chatFixtures(page);
  const message = "00000000-0000-0000-0000-000000000902";
  state.messages.push({
    id: message,
    room_id: id,
    sender_id: peer,
    body: "Bildirilecek test mesajı",
    created_at: "2026-10-27T09:05:00Z",
    hidden_at: null,
    profiles: profile(peer),
  });
  let report: Record<string, unknown> | undefined,
    block: Record<string, unknown> | undefined;
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_report_message",
    (route) => {
      report = route.request().postDataJSON();
      return route.fulfill({ status: 204, body: "" });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_block_user",
    (route) => {
      block = route.request().postDataJSON();
      return route.fulfill({ status: 204, body: "" });
    },
  );
  await page.goto(`/chat/${id}`);
  await page
    .getByRole("button", {
      name: "deniz: Bildirilecek test mesajı",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Bildirim gerekçesi", { exact: true })
    .fill("Spam içeren mesaj");
  await page
    .getByRole("button", { name: "Mesajı yönetime bildir", exact: true })
    .click();
  await expect
    .poll(() => report)
    .toEqual({ target: message, report_reason: "Spam içeren mesaj" });
  await page
    .getByRole("button", {
      name: "deniz: Bildirilecek test mesajı",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Bu göndereni engelle", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kişiyi engelle", exact: true })
    .click();
  await expect
    .poll(() => block)
    .toEqual({ target_user: peer, block_user: true });
});

test("staff reviews only the reported chat snapshot through the moderation screen", async ({
  page,
}) => {
  await member(page);
  let reviewed = false,
    historyReads = 0;
  const id = "00000000-0000-0000-0000-000000000903";
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-0000-0000-000000000200",
        username: "reviewer",
        display_name: "Reviewer",
        role: "moderator",
        membership_level: "Öncü Üye",
        reputation: 0,
      },
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/chat_reports?**", (route) =>
    route.fulfill({
      json: reviewed
        ? []
        : [
            {
              id,
              body_snapshot: "Yalnız bildirilen test mesajı",
              reason: "Spam",
              created_at: "2026-10-27T09:05:00Z",
            },
          ],
    }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/chat_messages?**",
    (route) => {
      historyReads++;
      return route.fulfill({ json: [] });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_review_report",
    (route) => {
      expect(route.request().postDataJSON()).toEqual({
        target: id,
        hide_message: true,
      });
      reviewed = true;
      return route.fulfill({ status: 204, body: "" });
    },
  );
  await page.goto("/moderation");
  await page
    .getByRole("button", {
      name: "Bildirilen sohbet mesajlarını incele",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Yalnız bildirilen test mesajı", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Mesajı kaldır ve bildirimi kapat",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Sohbet bildirim kararını kaydet",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Bekleyen sohbet bildirimi yok.", { exact: true }),
  ).toBeVisible();
  expect(historyReads).toBe(0);
});

const erasmusGroupId = "00000000-0000-0000-0000-00000000e001";
async function sharingFixtures(
  page: Page,
  status: string | null = null,
  manager = false,
) {
  const author = {
    display_name: "Normal member",
    username: "fixture_member",
    avatar_url: null,
  };
  const state = {
    groups: [
      {
        id: erasmusGroupId,
        name: "Erasmus",
        description: "Erasmus hazırlığında birbirimize destek oluyoruz.",
        is_system: true,
        owner_id: null as string | null,
        my_status: status,
        is_manager: manager,
        member_count: 1,
        request_count: manager ? 1 : 0,
      },
    ],
    posts: [] as Record<string, unknown>[],
    comments: [] as Record<string, unknown>[],
    requests: [] as string[],
    published: [] as Record<string, unknown>[],
    failPublish: false,
  };
  await page.route("https://*.supabase.co/rest/v1/**", async (route) => {
    const url = new URL(route.request().url()),
      endpoint = url.pathname.split("/").at(-1)!,
      args =
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : {};
    if (endpoint.startsWith("sharing_")) state.requests.push(endpoint);
    if (endpoint === "sharing_directory")
      return route.fulfill({
        json: args.target_group
          ? state.groups.filter((g) => g.id === args.target_group)
          : state.groups,
      });
    if (endpoint === "sharing_feed")
      return route.fulfill({ json: state.posts });
    if (endpoint === "sharing_request") {
      state.groups[0].my_status = "pending";
      return route.fulfill({ json: null });
    }
    if (endpoint === "sharing_create") {
      const id = "00000000-0000-0000-0000-00000000e002";
      state.groups.push({
        id,
        name: args.group_name,
        description: args.group_description,
        is_system: false,
        owner_id: "00000000-0000-0000-0000-000000000200",
        my_status: "active",
        is_manager: true,
        member_count: 1,
        request_count: 0,
      });
      return route.fulfill({ json: id });
    }
    if (endpoint === "sharing_publish") {
      state.published.push(args);
      if (state.failPublish) {
        state.failPublish = false;
        return route.fulfill({
          status: 503,
          json: { message: "Temporary connection failure" },
        });
      }
      state.posts.unshift({
        id: args.client_id,
        group_id: args.target,
        user_id: "00000000-0000-0000-0000-000000000200",
        body: args.post_body,
        created_at: "2026-10-27T12:00:00Z",
        author,
        liked: false,
        like_count: 0,
        comment_count: 0,
      });
      return route.fulfill({ json: args.client_id });
    }
    if (endpoint === "sharing_like") {
      state.posts[0].liked = args.liked;
      state.posts[0].like_count = args.liked ? 1 : 0;
      return route.fulfill({ json: null });
    }
    if (endpoint === "sharing_comment") {
      state.comments.push({
        id: args.client_id,
        user_id: "00000000-0000-0000-0000-000000000200",
        body: args.comment_body,
        created_at: "2026-10-27T12:05:00Z",
        profiles: author,
      });
      state.posts[0].comment_count = 1;
      return route.fulfill({ json: args.client_id });
    }
    if (endpoint === "sharing_group_comments")
      return route.fulfill({ json: state.comments });
    if (endpoint === "sharing_group_members")
      return route.fulfill({
        json: [
          {
            user_id: "00000000-0000-0000-0000-000000000301",
            status: state.groups[0].request_count ? "pending" : "active",
            role: "member",
            profiles: {
              display_name: "Erasmus öğrencisi",
              username: "erasmus_student",
              avatar_url: null,
            },
          },
        ],
      });
    if (endpoint === "sharing_manage") {
      state.groups[0].request_count = 0;
      state.groups[0].member_count = 2;
      return route.fulfill({ json: null });
    }
    return route.fallback();
  });
  return state;
}
test("country stories live only in Discover and checklist sources stay behind mobile options", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /topluluğu(?:, takip ediliyor)?$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Erasmus", exact: true }),
  ).toBeVisible();
  await page.goto("/discover");
  await expect(
    page.getByRole("link", { name: "Estonya topluluğu", exact: true }),
  ).toBeVisible();
  await page.goto("/country/spain?tab=Belgeler");
  await expect(
    page.getByRole("button", { name: "Belgeler", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Topluluk sohbeti", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Başvuru merkezinin yayımladığı belge", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "/tmp/groups-checklist-mobile.png" });
  await page
    .getByRole("button", { name: "Liste seçenekleri ve kaynaklar" })
    .click();
  await expect(
    page.getByText("Başvuru merkezinin yayımladığı belge", { exact: true }),
  ).toBeVisible();
});
test("guests discover Erasmus but cannot read or join without signing in", async ({
  page,
}) => {
  await fixtures(page);
  const state = await sharingFixtures(page);
  await page.goto("/groups");
  await page.getByRole("link", { name: "Erasmus grubunu aç" }).click();
  await expect(
    page.getByText("Paylaşımlar yalnız onaylı üyelere görünür.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Grupta paylaşım yap" }),
  ).toHaveCount(0);
  expect(state.requests).not.toContain("sharing_feed");
  await page.getByRole("button", { name: "Giriş yap ve katıl" }).click();
  await expect(page).toHaveURL(/\/auth$/);
});
test("members request admission, wait for approval, then share and comment without duplicate retries", async ({
  page,
}) => {
  await member(page);
  const state = await sharingFixtures(page);
  await page.goto(`/group/${erasmusGroupId}`);
  await page
    .getByRole("button", { name: "Katılma isteği gönder", exact: true })
    .click();
  await expect(
    page.getByText("Katılım isteğin onay bekliyor", { exact: true }),
  ).toBeVisible();
  expect(state.requests).not.toContain("sharing_feed");
  state.groups[0].my_status = "active";
  await page.reload();
  await page.getByRole("button", { name: "Grupta paylaşım yap" }).click();
  await page
    .getByLabel("Paylaşımın", { exact: true })
    .fill("Erasmus için konaklama araştırırken öğrendiğim bilgiler.");
  state.failPublish = true;
  await page.getByRole("button", { name: "Paylaş", exact: true }).click();
  await expect(
    page
      .getByText("İşlem tamamlanamadı. Yeniden deneyebilirsin.", {
        exact: true,
      })
      .last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Paylaş", exact: true }).click();
  await expect(
    page.getByText("Erasmus için konaklama araştırırken öğrendiğim bilgiler.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(state.published).toHaveLength(2);
  expect(state.published[0].client_id).toBe(state.published[1].client_id);
  await page.getByRole("button", { name: "Beğen", exact: true }).click();
  await expect(page.getByText("1 beğeni", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Yorumları aç", exact: true }).click();
  await page
    .getByLabel("Yorumun", { exact: true })
    .fill("Ben de kabul mektubumu bekliyorum.");
  await page
    .getByRole("button", { name: "Yorumu gönder", exact: true })
    .click();
  await expect(
    page.getByText("Ben de kabul mektubumu bekliyorum.", { exact: true }),
  ).toBeVisible();
});
test("group managers review membership requests and users create their own approval-based groups", async ({
  page,
}) => {
  await member(page);
  const state = await sharingFixtures(page, "active", true);
  await page.goto(`/group/${erasmusGroupId}`);
  await page
    .getByRole("button", { name: "1 katılım isteğini incele", exact: true })
    .click();
  await page
    .getByRole("button", { name: "erasmus_student üye işlemleri", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Katılımı onayla", exact: true })
    .click();
  await expect.poll(() => state.groups[0].member_count).toBe(2);
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await page.goto("/groups");
  await page.getByRole("button", { name: "Grup oluştur", exact: true }).click();
  await page.getByLabel("Grup adı", { exact: true }).fill("Berlin Erasmus");
  await page
    .getByLabel("Kısa açıklama", { exact: true })
    .fill("Berlin hazırlık grubu");
  await page
    .getByRole("button", { name: "Grubu oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Grupta paylaşım yap", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/e002$/);
  await expect(
    page.getByRole("button", { name: "Grubu oluştur", exact: true }),
  ).toBeHidden();
  await page.screenshot({ path: "/tmp/groups-owner-mobile.png" });
});

test("Erasmus is an inline home feed tab with isolated community posts", async ({
  page,
}) => {
  await member(page);
  const state = await sharingFixtures(page, "active");
  state.posts.push({
    id: "community-inline-post",
    group_id: erasmusGroupId,
    user_id: "00000000-0000-0000-0000-000000000301",
    body: "Sadece Erasmus topluluğundaki kabul mektubu deneyimi.",
    created_at: "2026-10-27T12:00:00Z",
    author: {
      display_name: "Erasmus öğrencisi",
      username: "erasmus_student",
      avatar_url: null,
    },
    like_count: 0,
    comment_count: 0,
    liked: false,
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Erasmus", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByText("Sadece Erasmus topluluğundaki kabul mektubu deneyimi.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Grupta paylaşım yap" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Tümü", exact: true }).click();
  await expect(
    page.getByText("Sadece Erasmus topluluğundaki kabul mektubu deneyimi.", {
      exact: true,
    }),
  ).toHaveCount(0);
});
test("recent searches are hidden until the mobile search field is focused", async ({
  page,
}) => {
  await fixtures(page);
  await page.addInitScript(() =>
    localStorage.setItem("recent-searches:guest", JSON.stringify(["Sigorta"])),
  );
  await page.goto("/discover");
  await expect(page.getByText("Son aramalar", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("Ülke, belge, deneyim veya soru ara", { exact: true })
    .click();
  await expect(page.getByText("Son aramalar", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Sigorta aramasını aç", exact: true })
    .click();
  await expect(
    page.getByLabel("Ülke, belge, deneyim veya soru ara", { exact: true }),
  ).toHaveValue("Sigorta");
  await expect(page.getByText("Son aramalar", { exact: true })).toHaveCount(0);
});
test("Denmark exposes its official checklist, invitation restriction and Copenhagen photo", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/country/denmark?tab=Belgeler");
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Türkiye için ev sahibi ve ziyaret koşullarını kontrol et",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", {
      name: "Türkiye için ev sahibi ve ziyaret koşullarını kontrol et",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Resmî Danimarka sayfası Türkiye’yi Grup 3 içinde sayar/),
  ).toBeVisible();
  await page.goto("/country/denmark");
  await expect(
    page.getByRole("img", { name: "Rosenborg Kalesi, Kopenhag", exact: true }),
  ).toBeVisible();
});
test("followed country pages are exhausted before other countries enter the home feed", async ({
  page,
}) => {
  await fixtures(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "guest-country-interests",
      JSON.stringify(["estonia"]),
    ),
  );
  const requests: { country: string; offset: number }[] = [];
  await page.route("https://*.supabase.co/rest/v1/feed?**", (route) => {
    const u = new URL(route.request().url()),
      country = u.searchParams.get("country_id") ?? "",
      offset = Number(u.searchParams.get("offset") ?? 0);
    requests.push({ country, offset });
    if (country.startsWith("not."))
      expect(
        requests.some((r) => r.country === "in.(estonia)" && r.offset === 15),
      ).toBe(true);
    const count = country === "in.(estonia)" ? (offset === 0 ? 15 : 1) : 1;
    return route.fulfill({
      json: Array.from({ length: count }, (_, i) => ({
        id: `${country.startsWith("not.") ? "other" : "followed"}-${offset + i}`,
        user_id: "00000000-0000-0000-0000-000000000301",
        country_id: country.startsWith("not.") ? "spain" : "estonia",
        kind: "question",
        title: `${country.startsWith("not.") ? "Diğer" : "Takip"} paylaşım ${offset + i}`,
        body: "Örnek başvuru sorusu ve gerçek içerik alanları.",
        status: "approved",
        created_at: "2026-10-27T10:00:00Z",
        is_sample: false,
        helpful_count: 0,
        comment_count: 0,
      })),
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("Takip paylaşım 0", { exact: true }),
  ).toBeVisible();
  await page.mouse.move(190, 500);
  await expect
    .poll(
      async () => {
        if (!requests.some((r) => r.country.startsWith("not.")))
          await page.mouse.wheel(0, 1400);
        return requests.some((r) => r.country.startsWith("not."));
      },
      { timeout: 15000, intervals: [300, 500, 800] },
    )
    .toBe(true);
  expect(requests[0]).toEqual({ country: "in.(estonia)", offset: 0 });
});
for (const theme of ["light", "dark"] as const) {
  test(`post details keep content prominent and hide empty and secondary metadata in ${theme} mode`, async ({
    page,
  }) => {
    await fixtures(page);
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          "app-appearance:v1",
          JSON.stringify({
            theme,
            reducedMotion: true,
            haptics: false,
            largeText: false,
          }),
        ),
      theme,
    );
    const id = "00000000-0000-0000-0000-000000000886";
    await page.route("https://*.supabase.co/rest/v1/feed?**", (r) =>
      r.fulfill({
        json: {
          id,
          kind: "experience",
          country_id: "spain",
          user_id: "00000000-0000-0000-0000-000000000301",
          title: "Başvurumdaki deneyim",
          body: "Belgelerimi tamamladım ve başvuru merkezine teslim ettim.",
          status: "approved",
          result: "approved",
          created_at: "2026-10-27T10:00:00Z",
          application_date: "2026-10-01",
          decision_date: "2026-10-02",
          processing_days: 24,
          granted_days: 1095,
          purpose: "Turistik",
          previous_visas: [
            {
              country: "Fransa",
              duration: "6 ay",
              entries: "multi",
              notes: "Önceki seyahatimden not.",
            },
          ],
          is_sample: false,
          helpful_count: 0,
          comment_count: 1,
        },
      }),
    );
    await page.route("https://*.supabase.co/rest/v1/comments?**", (r) =>
      r.fulfill({
        json: [
          {
            id: "comment-fixture",
            post_id: id,
            user_id: "00000000-0000-0000-0000-000000000302",
            parent_comment_id: null,
            body: "Bu deneyim benim için çok faydalı oldu.",
            status: "approved",
            created_at: "2026-10-27T12:00:00Z",
          },
        ],
      }),
    );
    await page.goto(`/experience/${id}`);
    await expect(
      page.getByText("Bu deneyim benim için çok faydalı oldu.", {
        exact: true,
      }),
    ).toBeInViewport();
    await expect(page.getByText("Süreç", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "0 Faydalı", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("3 yıl vize", { exact: false })).toBeVisible();
    await expect(
      page.getByText("24 günde sonuçlandı", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `/tmp/compact-detail-${theme}.png` });
    await page.getByRole("button", { name: "Detaylar", exact: true }).click();
    await expect(
      page.getByText("Henüz belirtilmedi", { exact: false }),
    ).toHaveCount(0);
    await expect(page.getByText("01/10/2026", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Paylaş", { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Başvuru tarihleri", exact: true })
      .click();
    await expect(page.getByText("01/10/2026", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Pasaport teslimi", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Önceki vizeler · 1", exact: true })
      .click();
    await expect(
      page.getByText("Fransa · 6 ay", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "İçeriği bildir", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `/tmp/compact-extra-details-${theme}.png` });
  });
}

test("mobile inbox searches conversations without hiding message requests or changing permissions", async ({
  page,
}) => {
  const { id } = await chatFixtures(page);
  await page.route("https://*.supabase.co/rest/v1/rpc/chat_inbox", (r) =>
    r.fulfill({
      json: [
        {
          id,
          kind: "direct",
          title: "Yol arkadaşı",
          status: "active",
          last_body: "Randevu tarihini konuşalım.",
          last_at: "2026-10-27T12:00:00Z",
          unread_count: 2,
          closed_at: null,
        },
        {
          id: "00000000-0000-0000-0000-000000000901",
          kind: "group",
          title: "İspanya hazırlık",
          status: "invited",
          last_body: null,
          last_at: "2026-10-27T10:00:00Z",
          unread_count: 0,
          closed_at: null,
        },
      ],
    }),
  );
  await page.goto("/messages");
  await expect(
    page.getByRole("link", {
      name: "İspanya hazırlık · Sohbet isteği",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/mobile2-inbox.png" });
  await page.getByLabel("Sohbet ara", { exact: true }).fill("Yol");
  await expect(
    page.getByRole("link", {
      name: "İspanya hazırlık · Sohbet isteği",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Yol arkadaşı", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/chat/${id}$`));
});

test("dark appearance persists and adapts forms, cards and larger text without changing photographs", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Görünüm", exact: true }).click();
  await page.getByRole("button", { name: "Karanlık", exact: true }).click();
  await expect(page.getByTestId("app-surface")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("app-appearance:v1") ?? "{}").theme,
      ),
    )
    .toBe("dark");
  await page.getByRole("switch", { name: "Büyük yazı", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Görünüm", { exact: true }),
  ).toHaveCSS("font-size", "21px");
  await page.reload();
  await expect(page.getByTestId("app-surface")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await page.goto("/discover");
  await expect(
    page.getByLabel("Ülke, belge, deneyim veya soru ara", { exact: true }),
  ).toHaveCSS("color", "rgb(228, 228, 228)");
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: "Rosenborg Kalesi, Kopenhag", exact: true })
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "/tmp/mobile3-dark-discover.png" });
  await page.goto("/country/denmark?tab=Belgeler");
  await expect(
    page.getByRole("checkbox", { name: "Pasaport: Hazırladım", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/mobile3-dark-checklist.png" });
});
test("own posts and comments can be deleted only after confirmation and purpose remains visible", async ({
  page,
}) => {
  await member(page);
  const id = "00000000-0000-0000-0000-000000000887",
    cid = "00000000-0000-0000-0000-000000000888";
  let comment = true,
    deleted = false;
  const post = {
    id,
    user_id: "00000000-0000-0000-0000-000000000200",
    country_id: "spain",
    kind: "experience",
    title: "Kültür etkinliği deneyimim",
    body: "Etkinlik davetimi belgelerimle birlikte sundum.",
    purpose: "Kültürel etkinlik",
    result: "approved",
    status: "approved",
    created_at: "2026-10-28T10:00:00Z",
    is_sample: false,
    helpful_count: 0,
    comment_count: 1,
  };
  await page.route("https://*.supabase.co/rest/v1/feed?**", (r) =>
    r.fulfill({
      json: new URL(r.request().url()).searchParams.has("id") ? post : [],
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/comments?**", (r) =>
    r.fulfill({
      json: comment
        ? [
            {
              id: cid,
              post_id: id,
              user_id: post.user_id,
              body: "Kendi yorumum.",
              parent_comment_id: null,
              status: "approved",
              created_at: "2026-10-28T11:00:00Z",
            },
          ]
        : [],
    }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/delete_own_content",
    (r) => {
      const args = r.request().postDataJSON();
      if (args.is_comment) {
        expect(args.target).toBe(cid);
        comment = false;
      } else {
        expect(args.target).toBe(id);
        deleted = true;
      }
      return r.fulfill({ status: 204, body: "" });
    },
  );
  await page.goto(`/experience/${id}`);
  await expect(
    page.getByText("Kültürel etkinlik", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Yorum seçenekleri", exact: true })
    .click();
  await page.getByRole("button", { name: "Yorumu sil", exact: true }).click();
  expect(comment).toBe(true);
  await page
    .getByRole("button", { name: "Silmeyi onayla", exact: true })
    .click();
  await expect(page.getByText("Kendi yorumum.", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Paylaşım seçenekleri", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Paylaşımı sil", exact: true })
    .click();
  expect(deleted).toBe(false);
  await page
    .getByRole("button", { name: "Silmeyi onayla", exact: true })
    .click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page).toHaveURL(/\/profile$/);
});
test("administrators add countries and documents from their profile tools while normal members are denied", async ({
  page,
}) => {
  await member(page);
  await page.goto("/admin-countries");
  await expect(
    page.getByText("Bu alan yöneticilere özel", { exact: true }),
  ).toBeVisible();
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (r) =>
    r.fulfill({
      json: {
        id: "00000000-0000-0000-0000-000000000200",
        username: "administrator",
        display_name: "Admin",
        role: "admin",
        membership_level: "Öncü Üye",
        reputation: 0,
      },
    }),
  );
  let saved = false,
    docs: {
      id: string;
      country_id: string;
      title: string;
      body: string;
      source_url: string;
    }[] = [];
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/admin_save_country",
    (r) => {
      expect(r.request().postDataJSON().payload).toMatchObject({
        id: "belgium",
        name: "Belçika",
        code: "BE",
        is_schengen: true,
      });
      saved = true;
      return r.fulfill({ json: "belgium" });
    },
  );
  await page.route("https://*.supabase.co/rest/v1/country_documents**", (r) => {
    if (r.request().method() === "POST") {
      const v = r.request().postDataJSON();
      docs.push({ id: "manual-document", ...v });
      return r.fulfill({ status: 201, body: "" });
    }
    return r.fulfill({ json: docs });
  });
  await page.goto("/profile");
  await expect(
    page.getByRole("button", { name: "İncelemede", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ülkeleri yönet", exact: true })
    .click();
  await page.getByLabel("Ülke adı", { exact: true }).fill("Belçika");
  await page.getByLabel("İki harfli ülke kodu", { exact: true }).fill("BE");
  await page.getByLabel("Ülke bağlantı adı", { exact: true }).fill("belgium");
  await page
    .getByRole("button", { name: "Ülkeyi kaydet", exact: true })
    .click();
  await expect.poll(() => saved).toBe(true);
  await page.getByRole("button", { name: "Belge ekle", exact: true }).click();
  await page.getByLabel("Belge adı", { exact: true }).fill("Pasaport");
  await page
    .getByLabel("Belge açıklaması", { exact: true })
    .fill("Güncel pasaport ve gerekli boş sayfalar.");
  await page
    .getByLabel("Belgenin resmî kaynağı (https)", { exact: true })
    .fill("https://example.com/official");
  await page
    .getByRole("button", { name: "Belgeyi kaydet", exact: true })
    .click();
  await expect.poll(() => docs.length).toBe(1);
});
test("the plane reaction becomes filled and respects reduced motion", async ({
  page,
}) => {
  await member(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "app-appearance:v1",
      JSON.stringify({
        theme: "light",
        reducedMotion: true,
        haptics: false,
        largeText: false,
      }),
    ),
  );
  const id = "00000000-0000-0000-0000-000000000889";
  let liked = false;
  await page.route("https://*.supabase.co/rest/v1/feed?**", (r) =>
    r.fulfill({
      json: [
        {
          id,
          user_id: "00000000-0000-0000-0000-000000000301",
          country_id: "spain",
          kind: "question",
          title: "Bir başvuru sorusu",
          body: "Güncel başvuru belgeleri hakkında bir soru.",
          status: "approved",
          created_at: "2026-10-28T10:00:00Z",
          is_sample: false,
          helpful_count: liked ? 1 : 0,
          comment_count: 0,
        },
      ],
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/helpful_votes**", (r) => {
    if (r.request().method() === "POST") liked = true;
    else if (r.request().method() === "DELETE") liked = false;
    return r.fulfill({
      json:
        r.request().method() === "GET"
          ? liked
            ? { user_id: "00000000-0000-0000-0000-000000000200" }
            : null
          : null,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "0 Faydalı", exact: true }).click();
  await expect(page.getByTestId("reaction-plane-filled")).toBeVisible();
  await page.getByRole("button", { name: "1 Faydalı", exact: true }).click();
  await expect(page.getByTestId("reaction-plane-outline")).toBeVisible();
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("app-appearance:v1")!);
    localStorage.setItem(
      "app-appearance:v1",
      JSON.stringify({ ...p, reducedMotion: false }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "0 Faydalı", exact: true }).click();
  await expect(page.getByTestId("reaction-plane-filled")).toBeVisible();
});

test("Spain shows the current sourced BLS appointment notice in the guide and checklist", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/country/spain?tab=Rehber");
  const notice = page.getByRole("button", {
    name: "İspanya randevu sistemi güncellendi",
    exact: true,
  });
  await expect(notice).toHaveAttribute("aria-expanded", "false");
  await notice.click();
  await expect(
    page.getByText("Randevu açılışı", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Kontenjanlar her ayın 1’i ve 16’sında/),
  ).toBeVisible();
  await expect(
    page.getByText("Ankara: kimlik doğrulaması", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "BLS Ankara duyurusu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "BLS’den randevu al", exact: true }),
  ).toBeVisible();
  await page.goto("/country/spain?tab=Belgeler");
  await expect(
    page.getByRole("button", {
      name: "İspanya randevu sistemi güncellendi",
      exact: true,
    }),
  ).toBeVisible();
});

test("important information keeps guidance behind help buttons without losing the draft", async ({
  page,
}) => {
  await member(page);
  await page.goto("/create?kind=tip&country=spain&category=doc-insurance");
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Sigorta poliçesinde tarih kontrolü");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill("Poliçedeki seyahat tarihlerini kontrol ettiler.");
  await expect(page.getByText("0 / 8000", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(/Belge seçenekleri seçtiğin ülkenin/),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Paylaşım hakkında bilgi", exact: true })
    .click();
  await expect(page.getByText(/Yayınlanması resmî bilgi olduğu/)).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kapat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Topluluk notu nerede görünür?", exact: true })
    .click();
  await expect(
    page.getByText(
      /İspanya belge listesindeki “Yurtdışı seyahat sağlık sigortası”/,
    ),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kapat", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Belge doğrulaması hakkında bilgi",
      exact: true,
    })
    .click();
  await expect(page.getByText(/her biri en fazla 8 MB/)).toBeVisible();
  await expect(page.getByText(/etiket ve \+10 puan/)).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kapat", exact: true })
    .click();
  await expect(page.getByLabel("Kısa bir başlık", { exact: true })).toHaveValue(
    "Sigorta poliçesinde tarih kontrolü",
  );
  await expect(page.getByLabel("Detaylar", { exact: true })).toHaveValue(
    "Poliçedeki seyahat tarihlerini kontrol ettiler.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/tip-simple-mobile.png", fullPage: true });
});

test("settings keep email management and no longer offer private profiles", async ({
  page,
}) => {
  await member(page);
  let isPrivate = false,
    relation: string | null = null,
    email = "";
  const owner = "00000000-0000-0000-0000-000000000200",
    peer = "00000000-0000-0000-0000-000000000301";
  await page.route("https://*.supabase.co/rest/v1/rpc/social_profile", (r) =>
    r.fulfill({
      json: {
        is_private: isPrivate,
        can_view: !isPrivate,
        followers: 12,
        following: 8,
        relationship: relation,
      },
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (r) => {
    if (r.request().method() === "PATCH") {
      isPrivate = r.request().postDataJSON().is_private ?? isPrivate;
      return r.fulfill({ status: 204, body: "" });
    }
    const other = new URL(r.request().url()).searchParams.has("username");
    return r.fulfill({
      json: {
        id: other ? peer : owner,
        username: other ? "private_peer" : "fixture_member",
        display_name: other ? "Private Peer" : "Test Yolcu",
        role: "user",
        membership_level: "Öncü Üye",
        bio: "",
        is_private: other || isPrivate,
        reputation: 0,
      },
    });
  });
  await page.route("https://*.supabase.co/auth/v1/user**", (r) => {
    email = r.request().postDataJSON().email;
    return r.fulfill({ json: { id: owner, email } });
  });
  await page.goto("/settings");
  await expect(page.getByLabel("Biyografi", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Profili düzenle", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/social-settings-final.png" });
  await page
    .getByRole("button", { name: "Profili düzenle", exact: true })
    .click();
  await expect(page.getByLabel("Biyografi", { exact: true })).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kapat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hesap ve güvenlik", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Gizli profil", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Yeni e-posta adresi", { exact: true })
    .fill("changed@example.com");
  await page
    .getByRole("button", { name: "E-postayı değiştir", exact: true })
    .click();
  await expect.poll(() => email).toBe("changed@example.com");
});

test("posts can be sent from their action row to an existing private chat", async ({
  page,
}) => {
  const { id, state } = await chatFixtures(page);
  const pid = "00000000-0000-0000-0000-000000000982";
  const post = {
    id: pid,
    user_id: "00000000-0000-0000-0000-000000000300",
    country_id: "spain",
    kind: "question",
    title: "Sigorta hakkında sorum",
    body: "Başvurum için sigorta süresini öğrenmek istiyorum.",
    status: "approved",
    created_at: "2026-10-28T10:00:00Z",
    helpful_count: 5,
    comment_count: 0,
  };
  await page.route("https://*.supabase.co/rest/v1/feed?**", (r) =>
    r.fulfill({
      json: new URL(r.request().url()).searchParams.has("id") ? post : [post],
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/rpc/chat_inbox", (r) =>
    r.fulfill({
      json: [
        {
          id,
          kind: "direct",
          title: "Deniz",
          status: "active",
          closed_at: null,
          unread_count: 0,
        },
      ],
    }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_send_attachment",
    (r) => {
      const p = r.request().postDataJSON();
      expect(p.shared_post).toBe(pid);
      state.messages.push({
        id: p.client_id,
        room_id: id,
        sender_id: "00000000-0000-0000-0000-000000000200",
        body: "Paylaşım",
        shared_post_id: pid,
        created_at: "2026-10-28T10:00:00Z",
        hidden_at: null,
      });
      return r.fulfill({ json: p.client_id });
    },
  );
  await page.goto(`/question/${pid}`);
  await page
    .getByRole("button", { name: "Paylaşımı gönder", exact: true })
    .click();
  const recipientSearch = page.getByLabel(
    "Göndermek için kişi veya sohbet ara",
    { exact: true },
  );
  await recipientSearch.fill("Olmayan kişi");
  await expect(
    page.getByText("Sohbet bulunamadı.", { exact: true }),
  ).toBeVisible();
  await recipientSearch.fill("deniz");
  await page
    .getByRole("button", { name: "Deniz sohbetine gönder", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/chat/${id}$`));
  await expect(
    page.getByRole("link", { name: "Gönderilen paylaşımı aç", exact: true }),
  ).toBeVisible();
});

test("accepted direct chats can send gallery photos into private storage", async ({
  page,
}) => {
  const { id, state } = await chatFixtures(page);
  let path = "";
  const nestingErrors: string[] = [];
  page.on("console", (m) => {
    if (/cannot contain|cannot be a descendant/.test(m.text()))
      nestingErrors.push(m.text());
  });
  await page.route(
    "https://*.supabase.co/storage/v1/object/chat-media/**",
    (r) => {
      path = new URL(r.request().url()).pathname.split("/chat-media/")[1];
      return r.fulfill({ json: { Key: path } });
    },
  );
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/chat_send_attachment",
    (r) => {
      const p = r.request().postDataJSON();
      expect(p.photo_path).toBe(path);
      state.messages.push({
        id: p.client_id,
        room_id: id,
        sender_id: "00000000-0000-0000-0000-000000000200",
        body: "Fotoğraf",
        image_path: path,
        created_at: "2026-10-28T10:00:00Z",
        hidden_at: null,
      });
      return r.fulfill({ json: p.client_id });
    },
  );
  await page.route(
    "https://*.supabase.co/storage/v1/object/sign/chat-media/**",
    (r) =>
      r.request().method() === "POST"
        ? r.fulfill({
            json: {
              signedURL: "/object/sign/chat-media/fixture.png?token=fixture",
            },
          })
        : r.fulfill({
            contentType: "image/png",
            body: Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5FoAAAAASUVORK5CYII=",
              "base64",
            ),
          }),
  );
  await page.goto(`/chat/${id}`);
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Galeriden fotoğraf ekle", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5FoAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("button", { name: "Fotoğrafı kaldır", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mesaj gönder", exact: true }).click();
  await expect.poll(() => path).toContain(id);
  await expect(
    page.getByRole("button", { name: "Fotoğrafı aç", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Sohbet fotoğrafı", exact: true }),
  ).toBeVisible();
  expect(nestingErrors).toEqual([]);
  await page.screenshot({ path: "/tmp/social-chat-photo.png" });
});

test("profile tabs preserve scroll position and compact dates keep keyboard progression", async ({
  page,
}) => {
  await member(page);
  const me = "00000000-0000-0000-0000-000000000200";
  await page.route("https://*.supabase.co/rest/v1/rpc/social_profile", (r) =>
    r.fulfill({
      json: {
        can_view: true,
        is_private: false,
        followers: 1,
        following: 2,
        relationship: null,
      },
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/feed?**", (r) =>
    r.fulfill({
      json: Array.from({ length: 8 }, (_, i) => ({
        id: `profile-${i}`,
        user_id: me,
        country_id: "spain",
        kind: "experience",
        title: `Deneyim ${i}`,
        body: "Başvuru deneyimim.",
        status: "approved",
        created_at: "2026-10-28T10:00:00Z",
        helpful_count: 0,
        comment_count: 0,
      })),
    }),
  );
  await page.goto("/profile");
  const tab = page.getByRole("tab", { name: "Deneyimler", exact: true });
  await expect(tab).toBeVisible();
  await page.screenshot({ path: "/tmp/profile-refreshed.png" });
  await tab.scrollIntoViewIfNeeded();
  const scroll = await tab.evaluate((el) => {
    let p = el.parentElement;
    while (p) {
      if (
        p.scrollHeight > p.clientHeight + 150 &&
        ["auto", "scroll"].includes(getComputedStyle(p).overflowY)
      ) {
        p.scrollTop = 120;
        return p.scrollTop;
      }
      p = p.parentElement;
    }
    return -1;
  });
  expect(scroll).toBeGreaterThan(50);
  await tab.click();
  await expect(
    page.getByRole("tab", { name: "Deneyimler", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const after = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll("div")).find(
        (el) =>
          el.scrollHeight > el.clientHeight + 150 &&
          ["auto", "scroll"].includes(getComputedStyle(el).overflowY),
      )?.scrollTop ?? 0,
  );
  expect(after).toBeGreaterThan(50);
  const scoreBox = await page.getByText("Puan", { exact: true }).boundingBox();
  if (!scoreBox) throw Error("Profile metrics not visible");
  const swipeY = scoreBox.y + scoreBox.height / 2;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 370, y: swipeY }],
  });
  for (const x of [340, 300, 260, 220, 170, 100])
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: swipeY }],
    });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(
    page.getByRole("tab", { name: "Sorular", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await page.goto("/create");
  await page
    .getByRole("button", { name: "Vize başvurusu deneyimi", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Başvuru ülkesi: Ülke seç", exact: true })
    .click();
  await page.getByRole("radio", { name: "İspanya", exact: true }).click();
  await page.getByLabel("Başvuru şehri", { exact: true }).fill("İstanbul");
  await page.getByLabel("Başvuru merkezi", { exact: true }).fill("BLS");
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await expect(
    page.getByLabel("Başvuru tarihi · gün", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "✓ Onaylandı", exact: true }).click();
  await expect(
    page.getByLabel("Kaç günde sonuçlandı?", { exact: true }),
  ).toBeVisible();
});

test("sharing offers four distinct paths and general stories omit visa fields", async ({
  page,
}) => {
  await member(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", (r) => {
    submitted = r.request().postDataJSON();
    return r.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create");
  for (const name of [
    "Vize başvurusu deneyimi",
    "Genel deneyim paylaşımı",
    "? Soru sor",
    "⚡ Önemli bilgi paylaş",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/profile-four-options.png" });
  await page
    .getByRole("button", { name: "Genel deneyim paylaşımı", exact: true })
    .click();
  await expect(page.getByLabel("Başvuru merkezi", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Başvuru ülkesi: Ülke seç", exact: true })
    .click();
  await page.getByRole("radio", { name: "İspanya", exact: true }).click();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Barselona seyahatimden öneriler");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Seyahatimde toplu taşıma kartı ve önceden bilet almak çok işime yaradı.",
    );
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect(
    page.getByText("Gönderin incelemeye alındı 🎉", { exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    kind: "general",
    category_id: "general-experience",
    country_id: "spain",
  });
  expect(submitted).not.toHaveProperty("result");
  expect(submitted).not.toHaveProperty("application_date");
});

test("discover includes matching people in All results", async ({ page }) => {
  await fixtures(page);
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) => {
    expect(new URL(route.request().url()).searchParams.get("or")).toContain(
      "deniz",
    );
    return route.fulfill({
      json: [
        {
          id: "00000000-0000-0000-0000-000000000988",
          username: "denizyolcu",
          display_name: "Deniz Yolcu",
          avatar_url: null,
        },
      ],
    });
  });
  await page.goto("/discover?q=Deniz");
  await expect(
    page.getByRole("button", {
      name: "@denizyolcu · Deniz Yolcu",
      exact: true,
    }),
  ).toBeVisible();
});

test("notifications highlight unread replies and filter them on mobile", async ({
  page,
}) => {
  await chatFixtures(page);
  await page.route("https://*.supabase.co/rest/v1/notifications?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "notice-reply",
          message: "Gönderine veya yorumuna yeni bir yanıt geldi.",
          post_id: null,
          read_at: null,
          created_at: "2026-10-28T10:00:00Z",
        },
        {
          id: "notice-badge",
          message: "Yeni rozetin: Gezgin",
          post_id: null,
          read_at: "2026-10-28T11:00:00Z",
          created_at: "2026-10-28T09:00:00Z",
        },
      ],
    }),
  );
  await page.goto("/notifications");
  await expect(
    page.getByText("Yeni rozetin: Gezgin", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yanıtlar", exact: true }).click();
  await expect(
    page.getByText("Yeni rozetin: Gezgin", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Gönderine veya yorumuna yeni bir yanıt geldi.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/notifications-mobile.png" });
});

async function fillSignup(page: Page) {
  await page.goto("/auth?mode=signup");
  await page.getByLabel("E-posta", { exact: true }).fill("ui-test@example.com");
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("test_yolcu");
  await page
    .getByLabel("Şifre · en az 8 karakter", { exact: true })
    .fill("Test1234");
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await page.getByLabel("Adınız", { exact: true }).fill("Test Yolcu");
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
}

test("signup explains a taken username without submitting or blaming the connection", async ({
  page,
}) => {
  await fixtures(page);
  let signups = 0;
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({ json: [{ id: "existing-profile" }] }),
  );
  await page.route("https://*.supabase.co/auth/v1/signup**", (route) => {
    signups++;
    return route.fulfill({ status: 500, json: { code: "unexpected_failure" } });
  });
  await fillSignup(page);
  await page
    .getByRole("button", { name: "Hesabımı oluştur", exact: true })
    .click();
  await expect(
    page.getByText("Bu kullanıcı adı alınmış. Başka bir kullanıcı adı seç.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(signups).toBe(0);
  await expect(page.getByText(/Bağlantını kontrol/)).toHaveCount(0);
});

test("signup handles a username race after a generic database failure", async ({
  page,
}) => {
  await fixtures(page);
  let checks = 0;
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({ json: ++checks === 1 ? [] : [{ id: "racing-profile" }] }),
  );
  await page.route("https://*.supabase.co/auth/v1/signup**", (route) =>
    route.fulfill({
      status: 500,
      json: {
        code: "unexpected_failure",
        msg: "Database error saving new user",
      },
    }),
  );
  await fillSignup(page);
  await page
    .getByRole("button", { name: "Hesabımı oluştur", exact: true })
    .click();
  await expect(
    page.getByText("Bu kullanıcı adı alınmış. Başka bir kullanıcı adı seç.", {
      exact: true,
    }),
  ).toBeVisible();
});

for (const type of ["signup", "recovery"] as const) {
  test(`email ${type} redirect shows the correct focused screen`, async ({
    page,
  }) => {
    await fixtures(page);
    const user = {
      id: "00000000-0000-0000-0000-000000000999",
      aud: "authenticated",
      role: "authenticated",
      email: "verified@example.com",
      email_confirmed_at: "2026-10-28T10:00:00Z",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-10-28T10:00:00Z",
    };
    await page.route("https://*.supabase.co/auth/v1/user", (route) =>
      route.fulfill({ json: user }),
    );
    const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })).toString("base64url")}.test-signature`;
    await page.goto(
      `/auth#access_token=${jwt}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=${type}`,
    );
    if (type === "recovery") {
      await expect(
        page.getByText("Yeni bir şifre seç.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("E-posta adresin doğrulandı", { exact: true }),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByText("E-posta adresin doğrulandı", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("E-posta", { exact: true })).toHaveCount(0);
      await page.screenshot({ path: "/tmp/email-verified-mobile.png" });
      await page
        .getByRole("button", { name: "Giriş ekranına dön", exact: true })
        .click();
      await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
      await expect(
        page.getByText("E-posta adresin doğrulandı", { exact: true }),
      ).toHaveCount(0);
    }
  });
}

test("expired verification link shows an error and an arbitrary success flag cannot verify email", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/auth#error=access_denied&error_code=otp_expired");
  await expect(
    page.getByText("Bağlantı açılamadı", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/auth?confirmed=1");
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  await expect(
    page.getByText("E-posta adresin doğrulandı", { exact: true }),
  ).toHaveCount(0);
});

test("signup has three compact steps, validates each and preserves values going back", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/auth?mode=signup");
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Adınız", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect(
    page.getByText("Geçerli bir e-posta adresi yaz.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("E-posta", { exact: true }).fill("steps@example.com");
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect(page.getByLabel("E-posta", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Şifre · en az 8 karakter", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Adınız", { exact: true })).toHaveCount(0);
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("steps_member");
  await page
    .getByLabel("Şifre · en az 8 karakter", { exact: true })
    .fill("short");
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect(
    page.getByText("En az 8 karakter kullan.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Şifre · en az 8 karakter", { exact: true })
    .fill("Strong1234");
  await page.screenshot({ path: "/tmp/signup-account-step.png" });
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Adınız", { exact: true })).toBeVisible();
  const photo = page.getByRole("button", {
    name: "Profil fotoğrafı ekle (isteğe bağlı)",
    exact: true,
  });
  await expect(photo).toBeVisible();
  const box = await photo.boundingBox();
  expect(box!.width).toBe(box!.height);
  await expect(photo).toHaveCSS("border-radius", "64px");
  await page.getByLabel("Adınız", { exact: true }).fill("Gezgin Yolcu");
  await page.screenshot({ path: "/tmp/signup-profile-step.png" });
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toHaveValue(
    "steps_member",
  );
  await expect(
    page.getByLabel("Şifre · en az 8 karakter", { exact: true }),
  ).toHaveValue("Strong1234");
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await expect(page.getByLabel("E-posta", { exact: true })).toHaveValue(
    "steps@example.com",
  );
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect(page.getByLabel("Adınız", { exact: true })).toHaveValue(
    "Gezgin Yolcu",
  );
});

test("account deletion requires confirmation, handles the wrong password and only logs out on real success", async ({
  page,
}) => {
  await chatFixtures(page);
  let requests = 0,
    accepted = false;
  await page.route(
    "https://*.supabase.co/functions/v1/delete-account",
    (route) => {
      requests++;
      expect(route.request().postDataJSON()).toEqual({
        password: accepted ? "correct-password" : "wrong-password",
        confirmation: "SİL",
      });
      return route.fulfill({
        status: accepted ? 200 : 403,
        json: { code: accepted ? "deleted" : "invalid_password" },
      });
    },
  );
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Hesap ve güvenlik", exact: true })
    .click();
  await page.getByRole("button", { name: "Hesabımı sil", exact: true }).click();
  const remove = page.getByRole("button", {
    name: "Hesabımı kalıcı olarak sil",
    exact: true,
  });
  await expect(remove).toBeDisabled();
  expect(requests).toBe(0);
  await page
    .getByLabel("Mevcut şifren", { exact: true })
    .fill("wrong-password");
  await page.getByLabel("Onaylamak için SİL yaz", { exact: true }).fill("SİL");
  await remove.click();
  await expect(
    page.getByText("Şifren doğru değil. Kontrol edip yeniden dene.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
  await page.screenshot({ path: "/tmp/account-deletion-mobile.png" });
  accepted = true;
  await page
    .getByLabel("Mevcut şifren", { exact: true })
    .fill("correct-password");
  await remove.click();
  await expect(page).toHaveURL(/\/auth$/);
  expect(requests).toBe(2);
});

test("an unavailable account deletion backend never pretends the account was deleted", async ({
  page,
}) => {
  await chatFixtures(page);
  await page.route(
    "https://*.supabase.co/functions/v1/delete-account",
    (route) => route.fulfill({ status: 404, json: { code: "NOT_FOUND" } }),
  );
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Hesap ve güvenlik", exact: true })
    .click();
  await page.getByRole("button", { name: "Hesabımı sil", exact: true }).click();
  await page
    .getByLabel("Mevcut şifren", { exact: true })
    .fill("correct-password");
  await page.getByLabel("Onaylamak için SİL yaz", { exact: true }).fill("SIL");
  await page
    .getByRole("button", { name: "Hesabımı kalıcı olarak sil", exact: true })
    .click();
  await expect(
    page.getByText(
      "Hesap silme şu anda kullanılamıyor. Biraz sonra yeniden dene.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
});

test("group managers can confirm deletion from the inline feed without leaving a ghost community tab", async ({
  page,
}) => {
  await member(page);
  const state = await sharingFixtures(page, "active", true);
  let removals = 0;
  await page.route(
    "https://*.supabase.co/rest/v1/rpc/sharing_remove_group",
    (route) => {
      expect(route.request().postDataJSON()).toEqual({
        target: erasmusGroupId,
      });
      removals++;
      state.groups.splice(0, state.groups.length);
      return route.fulfill({ json: null });
    },
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Erasmus", exact: true }).click();
  await page
    .getByRole("button", { name: "Grup bilgisi ve yönetimi", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Topluluğu sil", exact: true })
    .click();
  await expect(
    page.getByText(
      /Erasmus topluluğu, paylaşımları ve yorumları kalıcı olarak silinecek/,
    ),
  ).toBeVisible();
  expect(removals).toBe(0);
  await page
    .getByRole("button", { name: "Topluluğu kalıcı olarak sil", exact: true })
    .click();
  await expect.poll(() => removals).toBe(1);
  await expect(
    page.getByRole("tab", { name: "Tümü", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tab", { name: "Erasmus", exact: true }),
  ).toHaveCount(0);
});

test("ordinary group members do not see group deletion", async ({ page }) => {
  await member(page);
  await sharingFixtures(page, "active", false);
  await page.goto(`/group/${erasmusGroupId}`);
  await page
    .getByRole("button", { name: "Grup bilgisi ve yönetimi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Gruptan ayrıl", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Topluluğu sil", exact: true }),
  ).toHaveCount(0);
});

test("app admins can open deletion for a private community without fetching its feed", async ({
  page,
}) => {
  await member(page);
  const state = await sharingFixtures(page, null, false);
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-0000-0000-000000000200",
        username: "fixture_admin",
        display_name: "Admin",
        role: "admin",
      },
    }),
  );
  await page.goto(`/group/${erasmusGroupId}`);
  await page
    .getByRole("button", { name: "Grup bilgisi ve yönetimi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Topluluğu sil", exact: true }),
  ).toBeVisible();
  expect(state.requests).not.toContain("sharing_feed");
});

for (const theme of ["light", "dark"] as const) {
  test(`rejected experience has red accents and employment beside the author in ${theme} mode`, async ({
    page,
  }) => {
    await fixtures(page);
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          "app-appearance:v1",
          JSON.stringify({
            theme,
            reducedMotion: true,
            haptics: false,
            largeText: false,
          }),
        ),
      theme,
    );
    const base = {
      user_id: "00000000-0000-0000-0000-000000000300",
      country_id: "spain",
      kind: "experience",
      body: "Kültürel etkinlik için başvuru deneyimim.",
      status: "approved",
      created_at: "2026-10-28T10:00:00Z",
      helpful_count: 0,
      comment_count: 0,
      application_date: "2026-10-01",
      decision_date: "2026-10-25",
      city: "İstanbul",
      employment_status: "Öğrenci",
      purpose: "Kültürel etkinlik",
      source_type: "submission",
    };
    await page.route("https://*.supabase.co/rest/v1/feed?**", (route) =>
      route.fulfill({
        json: [
          {
            ...base,
            id: "00000000-0000-0000-0000-000000000991",
            title: "Ret başvuru deneyimim",
            result: "rejected",
          },
          {
            ...base,
            id: "00000000-0000-0000-0000-000000000992",
            title: "Onay başvuru deneyimim",
            result: "approved",
          },
        ],
      }),
    );
    await page.goto("/");
    const card = page
      .getByText("✕ Reddedildi", { exact: true })
      .locator("../..");
    await expect(card).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(43, 32, 39)" : "rgb(255, 243, 241)",
    );
    const purpose = card.getByText("Kültürel etkinlik", { exact: true });
    await expect(
      card.getByRole("link", { name: "Üye profilini aç" }),
    ).toContainText("İstanbul · Öğrenci");
    const red = theme === "dark" ? "rgb(241, 151, 162)" : "rgb(158, 48, 65)";
    await expect(purpose).toHaveCSS("color", red);
    await expect(card.getByText("Vize deneyimi", { exact: true })).toHaveCSS(
      "color",
      red,
    );
    await expect(
      card.getByText("Kullanıcı deneyimi", { exact: true }),
    ).toHaveCSS("color", red);
    const approved = page
      .getByText("✓ Onaylandı", { exact: true })
      .locator("../..");
    await expect(approved).not.toHaveCSS(
      "background-color",
      await card.evaluate((el) => getComputedStyle(el).backgroundColor),
    );
    await page.screenshot({ path: `/tmp/rejected-card-${theme}.png` });
  });
}

test("black theme uses neutral profile surfaces and readable primary actions", async ({
  page,
}) => {
  await member(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "app-appearance:v1",
      JSON.stringify({
        theme: "dark",
        reducedMotion: true,
        haptics: false,
        largeText: false,
      }),
    ),
  );
  await page.goto("/profile");
  const messages = page.getByRole("button", {
    name: "Mesajlarım",
    exact: true,
  });
  await expect(messages).toBeVisible();
  await expect(page.getByTestId("app-surface")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await page.screenshot({ path: "/tmp/black-theme-profile.png" });
  await page.goto("/auth?mode=signup");
  const next = page.getByRole("button", { name: "Devam et", exact: true });
  await expect(next).toHaveCSS("background-color", "rgb(232, 232, 232)");
  await expect(next.getByText("Devam et", { exact: true })).toHaveCSS(
    "color",
    "rgb(8, 8, 8)",
  );
  await expect(page.getByLabel("E-posta", { exact: true })).toHaveCSS(
    "color",
    "rgb(228, 228, 228)",
  );
  await page.screenshot({ path: "/tmp/black-theme-auth.png" });
});

for (const theme of ["light", "dark"] as const) {
  test(`green and amber status cards keep colored surfaces and experience labels in ${theme} mode`, async ({
    page,
  }) => {
    await fixtures(page);
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          "app-appearance:v1",
          JSON.stringify({
            theme,
            reducedMotion: true,
            largeText: false,
            haptics: false,
          }),
        ),
      theme,
    );
    const base = {
      user_id: "00000000-0000-0000-0000-000000000300",
      country_id: "spain",
      kind: "experience",
      body: "Başvuru sırasında yaşadıklarımı paylaşıyorum.",
      status: "approved",
      created_at: "2026-10-28T10:00:00Z",
      helpful_count: 0,
      comment_count: 0,
      purpose: "Kültürel etkinlik",
      source_type: "submission",
    };
    await page.route("https://*.supabase.co/rest/v1/feed?**", (route) =>
      route.fulfill({
        json: [
          {
            ...base,
            id: "00000000-0000-0000-0000-000000000971",
            title: "Onay deneyimim",
            result: "approved",
          },
          {
            ...base,
            id: "00000000-0000-0000-0000-000000000972",
            title: "Bekleyen deneyimim",
            result: "waiting",
          },
          {
            ...base,
            id: "00000000-0000-0000-0000-000000000973",
            title: "Randevu önemli bilgisi",
            kind: "tip",
          },
        ],
      }),
    );
    await page.goto("/");
    const green = page
      .getByText("✓ Onaylandı", { exact: true })
      .locator("../..");
    const amber = page
      .getByText("◷ Bekliyor", { exact: true })
      .locator("../..");
    await expect(green).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(24, 43, 34)" : "rgb(240, 247, 242)",
    );
    await expect(amber).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(48, 41, 25)" : "rgb(255, 246, 229)",
    );
    await expect(
      green.getByText("Kullanıcı deneyimi", { exact: true }),
    ).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(120, 213, 163)" : "rgb(23, 103, 68)",
    );
    await expect(
      amber.getByText("Kullanıcı deneyimi", { exact: true }),
    ).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(235, 200, 110)" : "rgb(135, 91, 16)",
    );
    const tip = page
      .getByRole("link", { name: "Randevu önemli bilgisi", exact: true })
      .locator("../..");
    await expect(tip).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(48, 41, 25)" : "rgb(255, 246, 229)",
    );
    await page.screenshot({ path: `/tmp/semantic-cards-${theme}.png` });
  });
}

test("light mode is monochrome and profile keeps badges inside the summary with progress and admin tools in settings", async ({
  page,
}) => {
  await member(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "app-appearance:v1",
      JSON.stringify({
        theme: "light",
        reducedMotion: true,
        largeText: false,
        haptics: false,
      }),
    ),
  );
  await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-0000-0000-000000000200",
        username: "fixture_member",
        display_name: "Normal member",
        membership_level: "Gezgin",
        role: "admin",
        badge_score: 42,
      },
    }),
  );
  await page.route("https://*.supabase.co/rest/v1/user_badges?**", (route) =>
    route.fulfill({
      json: [
        {
          badge_id: "europe-conqueror",
          badges: {
            name: "Avrupa Fatihi",
            icon: "earth-outline",
            badge_group: "achievement",
          },
        },
        {
          badge_id: "gezgin",
          badges: {
            name: "Gezgin",
            icon: "footsteps-outline",
            badge_group: "level",
          },
        },
      ],
    }),
  );
  await page.goto("/profile");
  await expect(page.getByTestId("app-surface")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  const summary = page
    .getByRole("button", { name: "Profil ve ayarlar", exact: true })
    .locator("../..");
  await expect(
    summary.getByText("Avrupa Fatihi", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Gezgin", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Rozetlerim ve ilerlemem", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Moderasyon kuyruğu", { exact: true }),
  ).toHaveCount(0);
  const tab = page.getByRole("tab", { name: "Deneyimler", exact: true });
  await expect(tab).toHaveCSS("border-radius", "0px");
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(tab).toHaveCSS("border-bottom-width", "2px");
  await page.screenshot({ path: "/tmp/profile-minimal-light.png" });
  await page
    .getByRole("button", { name: "Profil ve ayarlar", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Rozetlerim ve ilerlemem", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yönetim", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ülkeleri yönet", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await page
    .getByRole("link", { name: "Rozetlerim ve ilerlemem", exact: true })
    .click();
  await expect(page).toHaveURL(/\/badges$/);
  await expect(
    page.getByText("Birlikte yol al, iz bırak.", { exact: true }),
  ).toBeVisible();
  await page.goto("/auth?mode=signup");
  const next = page.getByRole("button", { name: "Devam et", exact: true });
  await expect(next).toHaveCSS("background-color", "rgb(17, 17, 17)");
  await expect(next.getByText("Devam et", { exact: true })).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
});

for (const theme of ["light", "dark"] as const) {
  test(`inbox shows real member avatars and separates unread conversations from requests in ${theme} mode`, async ({
    page,
  }) => {
    const { id, own, peer } = await chatFixtures(page);
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          "app-appearance:v1",
          JSON.stringify({
            theme,
            reducedMotion: true,
            haptics: false,
            largeText: false,
          }),
        ),
      theme,
    );
    const group = "00000000-0000-0000-0000-000000000941",
      invite = "00000000-0000-0000-0000-000000000942",
      country = "00000000-0000-0000-0000-000000000943";
    const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#d5e4e5"/><circle cx="40" cy="29" r="13" fill="#688384"/><path d="M14 80V70a26 26 0 0 1 52 0v10" fill="#688384"/></svg>')}`;
    const now = new Date().toISOString();
    await page.route("https://*.supabase.co/rest/v1/rpc/chat_inbox", (route) =>
      route.fulfill({
        json: [
          {
            id,
            kind: "direct",
            title: "Deniz Yolcu · @denizyolcu",
            status: "active",
            last_body: "Tamam, belgelerimi hazırlayıp haber vereceğim.",
            last_at: now,
            unread_count: 2,
            closed_at: null,
          },
          {
            id: group,
            kind: "group",
            title: "İspanya hazırlık",
            status: "active",
            last_body: "Herkese iyi yolculuklar!",
            last_at: now,
            unread_count: 0,
            closed_at: null,
          },
          {
            id: invite,
            kind: "direct",
            title: "Ece · @ece",
            status: "invited",
            last_body: "Private preview must stay hidden",
            last_at: now,
            unread_count: 4,
            closed_at: null,
          },
          {
            id: country,
            kind: "community",
            country_id: "spain",
            title: "İspanya",
            status: "active",
            last_body: "Randevu tarihleri güncellendi.",
            last_at: now,
            unread_count: 1,
            closed_at: null,
          },
        ],
      }),
    );
    const reads: string[] = [];
    await page.route(
      "https://*.supabase.co/rest/v1/chat_members?**",
      (route) => {
        const url = new URL(route.request().url());
        reads.push(url.searchParams.get("room_id") ?? "");
        expect(url.searchParams.get("user_id")).toBe(`neq.${own}`);
        expect(url.searchParams.get("room_id")).not.toContain(invite);
        expect(url.searchParams.get("room_id")).not.toContain(country);
        return route.fulfill({
          json: [
            {
              room_id: id,
              user_id: peer,
              profiles: {
                display_name: "Deniz Yolcu",
                username: "denizyolcu",
                avatar_url: photo,
              },
            },
            {
              room_id: group,
              user_id: peer,
              profiles: {
                display_name: "Deniz Yolcu",
                username: "denizyolcu",
                avatar_url: photo,
              },
            },
            {
              room_id: group,
              user_id: "00000000-0000-0000-0000-000000000301",
              profiles: {
                display_name: "Ayşe",
                username: "ayse",
                avatar_url: null,
              },
            },
          ],
        });
      },
    );
    await page.goto("/messages");
    const direct = page.getByRole("link", {
      name: "Deniz Yolcu · @denizyolcu",
      exact: true,
    });
    await expect(
      direct.getByRole("img", { name: "Deniz Yolcu", exact: true }),
    ).toBeVisible();
    await expect(
      direct.getByLabel("2 okunmamış mesaj", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Private preview must stay hidden", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("4 okunmamış mesaj", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "İspanya", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "İspanya sohbeti", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("İspanya: 1 okunmamış mesaj", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("tab", { name: "Okunmamış", exact: true })
        .getByText("1", { exact: true }),
    ).toBeVisible();
    expect(reads.length).toBeGreaterThan(0);
    await page.screenshot({ path: `/tmp/inbox-polished-${theme}.png` });
    await page.getByRole("tab", { name: "Okunmamış", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "İspanya hazırlık", exact: true }),
    ).toHaveCount(0);
    await expect(direct).toBeVisible();
    await page.getByRole("tab", { name: "İstekler", exact: true }).click();
    await expect(direct).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: "Ece · @ece · Sohbet isteği",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Tümü", exact: true }).click();
    await page.getByLabel("Sohbet ara", { exact: true }).fill("denizyolcu");
    await expect(direct).toBeVisible();
    // The same person participates in this group, so member-name search finds it too.
    await expect(
      page.getByRole("link", { name: "İspanya hazırlık", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Ece · @ece · Sohbet isteği",
        exact: true,
      }),
    ).toHaveCount(0);
  });
}

test("important information only offers the country's rendered documents and uses exact document topics", async ({
  page,
}) => {
  await member(page);
  const insurance = {
    ...spainFixture.documents.find((d) => d.sort_order === 5)!,
    title: "Sigorta belgesi (güncel liste)",
  };
  const topic = `document-${insurance.id}`;
  await page.route(
    "https://*.supabase.co/rest/v1/country_documents?**",
    (route) =>
      route.fulfill({
        json: [
          insurance,
          {
            id: "not-in-spain-checklist",
            country_id: "spain",
            title: "Listede gösterilmeyen ek belge",
            body: "Not in the rendered Spain checklist.",
          },
        ],
      }),
  );
  await page.route(
    "https://*.supabase.co/rest/v1/forum_categories?**",
    (route) =>
      route.fulfill({
        json: [
          { id: topic, name: insurance.title },
          { id: "visa-fee", name: "Vize ücreti" },
        ],
      }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?kind=tip&country=spain");
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await page
    .getByRole("button", { name: "Belge türünü seç", exact: true })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(13);
  await expect(
    page.getByRole("radio", { name: "Genel belge bilgisi", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: "Başvuru formu", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", {
      name: "Listede gösterilmeyen ek belge",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: insurance.title, exact: true }).click();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Güncel sigorta belgesi bilgisi");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Sigorta belgesini başvuru merkezinin güncel listesine göre hazırladım.",
    );
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect.poll(() => submitted?.category_id).toBe(topic);
});

test("visa fee notes appear in documents including the explicitly identified older BLS note", async ({
  page,
}) => {
  await member(page);
  const legacy = "0542061e-8117-444f-9c79-2d7755095dd4";
  const title = "BLS başvuru ücretini nakit istiyor kart geçmiyor";
  let submitted: Record<string, unknown> | undefined;
  await page.route(
    "https://*.supabase.co/rest/v1/forum_categories?**",
    (route) =>
      route.fulfill({ json: [{ id: "visa-fee", name: "Vize ücreti" }] }),
  );
  await page.route("https://*.supabase.co/rest/v1/posts**", (route) => {
    if (route.request().method() === "POST") {
      submitted = route.request().postDataJSON();
      return route.fulfill({ status: 201, body: "" });
    }
    const url = new URL(route.request().url());
    if (url.searchParams.get("or")?.includes(legacy)) {
      expect(url.searchParams.get("country_id")).toBe("eq.spain");
      expect(url.searchParams.get("status")).toBe("eq.approved");
      return route.fulfill({
        json: [
          {
            id: legacy,
            title,
            category_id: "doc-form",
            body: "Başvurumda ödeme yöntemini bu şekilde deneyimledim.",
          },
        ],
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/country/spain?tab=Belgeler");
  const fees = page
    .getByRole("button", { name: "Vize ücreti", exact: true })
    .locator("..");
  await expect(
    fees.getByRole("button", { name: title, exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/visa-fee-community-note.png" });
  await page.getByRole("button", { name: "Vize ücreti", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Vize ücreti hakkında önemli bilgi paylaş",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Vize ücreti", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Ücret ödeme yöntemi deneyimim");
  await page
    .getByLabel("Detaylar", { exact: true })
    .fill(
      "Başvuru sırasında ücretin ödenmesiyle ilgili deneyimimi paylaşıyorum.",
    );
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect.poll(() => submitted?.category_id).toBe("visa-fee");
});

test("community-only inbox pages do not hide private conversations on later pages", async ({
  page,
}) => {
  const { id } = await chatFixtures(page);
  const offsets: number[] = [];
  await page.route("https://*.supabase.co/rest/v1/rpc/chat_inbox", (route) => {
    const offset = route.request().postDataJSON().page_offset;
    offsets.push(offset);
    return route.fulfill({
      json:
        offset === 0
          ? Array.from({ length: 30 }, (_, i) => ({
              id: `community-${i}`,
              kind: "community",
              country_id: `country-${i}`,
              title: `Topluluk ${i}`,
              status: "active",
              last_body: "Bir topluluk mesajı",
              last_at: new Date().toISOString(),
              unread_count: 0,
              closed_at: null,
            }))
          : [
              {
                id,
                kind: "direct",
                title: "Özel arkadaş",
                status: "active",
                last_body: "Merhaba!",
                last_at: new Date().toISOString(),
                unread_count: 1,
                closed_at: null,
              },
            ],
    });
  });
  await page.goto("/messages");
  await expect(
    page.getByRole("link", { name: "Özel arkadaş", exact: true }),
  ).toBeVisible();
  expect(offsets).toContain(30);
  await expect(page.getByRole("link", { name: /^Topluluk \d/ })).toHaveCount(0);
});

test("dark navigation keeps large transition surfaces dark between tabs and messages", async ({
  page,
}) => {
  await member(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "app-appearance:v1",
      JSON.stringify({
        theme: "dark",
        reducedMotion: false,
        haptics: false,
        largeText: false,
      }),
    ),
  );
  await page.goto("/profile");
  await expect(page.getByTestId("app-surface")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await page.evaluate(() => {
    const state = { running: true, whiteFrames: 0, frames: 0 };
    (window as any).__navigationFrames = state;
    const sample = () => {
      state.frames++;
      if (
        [...document.querySelectorAll("div")].some((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            rect.width >= innerWidth * 0.9 &&
            rect.height >= innerHeight * 0.5 &&
            rect.bottom > 0 &&
            rect.top < innerHeight &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            style.backgroundColor === "rgb(255, 255, 255)"
          );
        })
      )
        state.whiteFrames++;
      if (state.running) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("tab", { name: "Keşfet" }).click();
  await expect(page).toHaveURL(/discover/);
  await page.getByRole("tab", { name: "Profil" }).click();
  await page.getByRole("button", { name: "Mesajlarım", exact: true }).click();
  await expect(page).toHaveURL(/messages/);
  await expect(page.getByRole("textbox", { name: "Sohbet ara" })).toBeVisible();
  const frames = await page.evaluate(() => {
    const state = (window as any).__navigationFrames;
    state.running = false;
    return state;
  });
  expect(frames.frames).toBeGreaterThan(0);
  expect(frames.whiteFrames).toBe(0);
});

test("visa validity accepts years and preserves the selected unit across steps", async ({
  page,
}) => {
  await member(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?country=spain");
  await page
    .getByRole("button", { name: "Vize başvurusu deneyimi", exact: true })
    .click();
  await page.getByLabel("Başvuru şehri", { exact: true }).fill("İstanbul");
  await page.getByLabel("Başvuru merkezi", { exact: true }).fill("BLS");
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await expect(
    page.getByLabel("Başvuru tarihi · gün", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "✓ Onaylandı", exact: true }).click();
  await page.getByLabel("Kaç günde sonuçlandı?", { exact: true }).fill("24");
  await page
    .getByLabel("Verilen vize süresi (onaylandıysa)", { exact: true })
    .fill("3");
  await page.getByRole("button", { name: "Yıl", exact: true }).click();
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await expect(
    page.getByLabel("Verilen vize süresi (onaylandıysa)", { exact: true }),
  ).toHaveValue("3");
  await expect(
    page.getByRole("button", { name: "Yıl", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Devam", exact: true }).click();
  await page
    .getByLabel("Kısa bir başlık", { exact: true })
    .fill("Üç yıllık vize deneyimim");
  await page
    .getByRole("button", { name: "İncelemeye gönder", exact: true })
    .click();
  await expect.poll(() => submitted?.granted_days).toBe(1095);
  expect(submitted).toMatchObject({
    processing_days: 24,
    application_date: null,
    decision_date: null,
    appointment_date: null,
    passport_date: null,
    requested_days: null,
  });
});

for (const mode of ["focus", "pagination"] as const) {
  test(`evidence queue refreshes on ${mode} and explains independent review for own documents`, async ({
    page,
  }) => {
    await member(page);
    const me = "00000000-0000-0000-0000-000000000200";
    await page.route("https://*.supabase.co/rest/v1/profiles?**", (route) =>
      route.fulfill({
        json: {
          id: me,
          username: "reviewer",
          display_name: "Reviewer",
          role: "admin",
          membership_level: "Öncü Üye",
        },
      }),
    );
    const ids = Array.from(
      { length: mode === "pagination" ? 51 : 1 },
      (_, i) => `00000000-0000-0000-0000-${String(1000 + i).padStart(12, "0")}`,
    );
    let available = mode === "pagination";
    const cursors: (string | null)[] = [];
    await page.route(
      "https://*.supabase.co/rest/v1/post_verifications?**",
      (route) => {
        const params = new URL(route.request().url()).searchParams;
        if (params.get("select") !== "post_id")
          return route.fulfill({
            json: {
              post_id: params.get("post_id")?.replace("eq.", ""),
              status: "pending",
              verified_at: null,
            },
          });
        cursors.push(params.get("post_id"));
        const cursor = params.get("post_id")?.replace("gt.", "");
        return route.fulfill({
          json: available
            ? ids
                .filter((id) => !cursor || id > cursor)
                .slice(0, 50)
                .map((post_id) => ({ post_id }))
            : [],
        });
      },
    );
    await page.route("https://*.supabase.co/rest/v1/feed?**", (route) => {
      const id = new URL(route.request().url()).searchParams
        .get("id")
        ?.replace("eq.", "");
      return route.fulfill({
        json: id
          ? {
              id,
              user_id: me,
              country_id: "spain",
              kind: "experience",
              title: `Belge paylaşımı ${ids.indexOf(id) + 1}`,
              body: "Belge incelemesi bekleyen örnek paylaşım.",
              status: "approved",
              result: "approved",
              created_at: "2026-10-28T10:00:00Z",
              helpful_count: 0,
              comment_count: 0,
            }
          : [],
      });
    });
    await page.route(
      "https://*.supabase.co/rest/v1/post_evidence?**",
      (route) =>
        route.fulfill({
          json: [
            {
              id: "fixture-evidence",
              file_name: "fixture-policy.pdf",
              size_bytes: 1000,
              storage_path: "private-fixture/file.pdf",
            },
          ],
        }),
    );
    await page.goto("/moderation");
    if (mode === "focus") {
      await expect(
        page.getByText("İnceleme bekleyen belge yok.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Belge notlarını incele", exact: true })
        .click();
      await expect(page).toHaveURL(/document-notes/);
      available = true;
      await page.goBack();
      await expect(
        page.getByText("Belge paylaşımı 1", { exact: true }),
      ).toBeVisible({ timeout: 3000 });
      await expect(
        page.getByText("Başka yönetici onayı bekleniyor", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Belgeleri yeterli buldum · Doğrula",
          exact: true,
        }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Kuyruğu yenile", exact: true })
        .click();
      await expect.poll(() => cursors.length).toBeGreaterThan(2);
      await page.screenshot({ path: "/tmp/compact-evidence-panel.png" });
      await page
        .getByRole("button", {
          name: "Belge incelemesi hakkında bilgi",
          exact: true,
        })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByText(
            "Belgeleri sadece sen ve yönetim görür. Kişisel bilgilerini gizle.",
            { exact: true },
          ),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("Belge paylaşımı 50", { exact: true }),
      ).toBeAttached();
      await page
        .getByRole("button", { name: "Diğer belgeleri göster", exact: true })
        .click();
      await expect(
        page.getByText("Belge paylaşımı 51", { exact: true }),
      ).toBeVisible();
      expect(cursors).toContain(`gt.${ids[49]}`);
      await expect(
        page.getByRole("button", {
          name: "Diğer belgeleri göster",
          exact: true,
        }),
      ).toHaveCount(0);
    }
  });
}
