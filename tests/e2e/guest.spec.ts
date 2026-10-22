import { test, expect, type Page } from "@playwright/test";
import levels from "../../src/content/community-levels.json";
// Deterministic UI tests use transport fixtures only; the shipped app uses real Supabase.
async function fixtures(page: Page, firstVisit = false) {
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
  await page.getByLabel("Adınız", { exact: true }).fill("Test Yolcu");
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("test_yolcu");
  await page.getByLabel("E-posta", { exact: true }).fill("ui-test@example.com");
  await page
    .getByLabel("Şifre · en az 8 karakter", { exact: true })
    .fill("Test1234");
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
  await expect(
    page.getByText(
      "İspanya rehberindeki Randevu adımında mor topluluk notu olarak görünür.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Davet mektubu", exact: true })
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
      .getByRole("link", { name: /topluluğuna git$/ })
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
    .getByRole("link", { name: "Fransa topluluğuna git", exact: true })
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
  await expect(page.getByText(/mor topluluk notu/)).toBeVisible();
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

test("experience accepts optional narrative, visa history and invitation notes with segmented dates", async ({
  page,
}) => {
  await member(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("https://*.supabase.co/rest/v1/posts", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: "" });
  });
  await page.goto("/create?country=spain");
  await page.getByRole("button", { name: /Vize deneyimi paylaş/ }).click();
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
  await page.getByLabel("Başvuru tarihi · gün", { exact: true }).fill("01");
  await expect(
    page.getByLabel("Başvuru tarihi · ay", { exact: true }),
  ).toBeFocused();
  await page.keyboard.type("10");
  await expect(
    page.getByLabel("Başvuru tarihi · yıl", { exact: true }),
  ).toBeFocused();
  await page.keyboard.type("2026");
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
    application_date: "2026-10-01",
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
  await expect(page.getByText("22/10/2026", { exact: false })).toBeVisible();
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
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("photo_fixture");
  await page
    .getByLabel("E-posta", { exact: true })
    .fill("photo-fixture@example.com");
  await page
    .getByLabel("Şifre · en az 8 karakter", { exact: true })
    .fill("Test1234");
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
  await expect(page.getByText("Her rota bir deneyimle başlar.")).toBeVisible();
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
  await expect(page.getByText("Her rota bir deneyimle başlar.")).toBeVisible();
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
