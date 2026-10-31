import { expect, test, type Page } from "@playwright/test";
import guides from "../../src/content/country-guides.json";
import legal from "../../src/content/legal-documents.json";

const userId = "30000000-0000-4000-8000-000000000001";
async function prepare(
  page: Page,
  options: {
    onboarding?: boolean;
    failure?: boolean;
    reducedMotion?: boolean;
    guest?: boolean;
  } = {},
) {
  let release!: () => void;
  let wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failing = options.failure ?? false;
  let requests = 0;
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "launch-fixture@example.invalid",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Örnek Yolcu" },
    created_at: "2026-10-30T00:00:00Z",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: expires, role: "authenticated", aud: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires, legal, reducedMotion, guest }) => {
      localStorage.clear();
      if (!guest)
        localStorage.setItem(
          "sb-ebnkdgvngufxarkwiyxt-auth-token",
          JSON.stringify({
            access_token: token,
            refresh_token: "fixture",
            expires_at: expires,
            expires_in: 3600,
            token_type: "bearer",
            user,
          }),
        );
      localStorage.setItem(
        "vizesel-privacy-preferences-v1",
        JSON.stringify({
          privacyVersion: legal[0].version,
          transferVersion: legal[1].version,
          supabase: true,
          google: true,
          github: true,
          acknowledgedAt: new Date().toISOString(),
        }),
      );
      localStorage.setItem("onboarding-planner-v1", "done");
      localStorage.setItem("onboarding-v1", "done");
      if (reducedMotion)
        localStorage.setItem(
          "app-appearance:v1",
          JSON.stringify({
            theme: "system",
            reducedMotion: true,
            haptics: false,
            largeText: false,
          }),
        );
    },
    {
      user,
      token,
      expires,
      legal,
      reducedMotion: options.reducedMotion,
      guest: options.guest,
    },
  );
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!url.hostname.endsWith(".supabase.co")) {
      if (!["localhost", "127.0.0.1"].includes(url.hostname))
        return route.abort();
      return route.continue();
    }
    const table = url.pathname.split("/").pop();
    if (table === "user") return route.fulfill({ json: user });
    if (table === "profiles") {
      if (url.searchParams.get("select") === "id")
        return route.fulfill({ json: [] });
      requests++;
      await wait;
      if (failing)
        return route.fulfill({
          status: 500,
          json: { message: "Temporary fixture outage" },
        });
      return route.fulfill({
        json: {
          id: userId,
          username: "ornek_yolcu",
          display_name: "Örnek Yolcu",
          role: "user",
          avatar_url: null,
          needs_onboarding: options.onboarding ?? false,
          bio: "",
          reputation: 0,
          created_at: user.created_at,
        },
      });
    }
    if (table === "countries") return route.fulfill({ json: guides });
    if (table === "refresh_my_progress") return route.fulfill({ json: null });
    return route.fulfill({ json: [] });
  });
  return {
    requests: () => requests,
    release: () => release(),
    recover: () => {
      failing = false;
      wait = Promise.resolve();
    },
  };
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme}: a returning social account sees the logo, then a fade instead of retry/sign-out buttons`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    const fixture = await prepare(page);
    await page.goto("./");
    await expect.poll(fixture.requests).toBeGreaterThan(0);
    const overlay = page.getByTestId("launch-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay.getByLabel("Vizesel", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Yeniden dene", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Girişe dön", exact: true }),
    ).toHaveCount(0);
    fixture.release();
    await expect
      .poll(
        async () => {
          if (!(await overlay.count())) return false;
          const opacity = Number(
            await overlay.evaluate(
              (element) => getComputedStyle(element).opacity,
            ),
          );
          return opacity > 0 && opacity < 1;
        },
        { intervals: [10, 20, 30] },
      )
      .toBe(true);
    await expect(overlay).toHaveCount(0);
    await expect(
      page.getByText("Kullanıcı adını seç", { exact: true }),
    ).toHaveCount(0);
  });
}

test("new social accounts still reach profile setup after loading", async ({
  page,
}) => {
  const fixture = await prepare(page, { onboarding: true });
  await page.goto("./");
  await expect.poll(fixture.requests).toBeGreaterThan(0);
  await expect(page.getByTestId("launch-overlay")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Yeniden dene", exact: true }),
  ).toHaveCount(0);
  fixture.release();
  await expect(
    page.getByText("Kullanıcı adını seç", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toBeVisible();
});

test("a real profile error offers recovery, and retry returns to the logo", async ({
  page,
}) => {
  const fixture = await prepare(page, { failure: true });
  await page.goto("./");
  await expect.poll(fixture.requests).toBeGreaterThan(0);
  fixture.release();
  await expect(
    page.getByRole("button", { name: "Yeniden dene", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: "Girişe dön", exact: true }),
  ).toBeVisible();
  fixture.recover();
  await page.getByRole("button", { name: "Yeniden dene", exact: true }).click();
  await expect(page.getByTestId("launch-overlay")).toBeVisible();
  await expect(page.getByTestId("launch-overlay")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Girişe dön", exact: true }),
  ).toHaveCount(0);
});

test("reduced motion dismisses the logo without a fade", async ({ page }) => {
  const fixture = await prepare(page, { reducedMotion: true });
  await page.goto("./");
  await expect.poll(fixture.requests).toBeGreaterThan(0);
  await expect(page.getByTestId("launch-overlay")).toBeVisible();
  fixture.release();
  await expect(page.getByTestId("launch-overlay")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Yeniden dene", exact: true }),
  ).toHaveCount(0);
});

async function emulateAccountKeyboard(page: Page) {
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), {
      height: window.innerHeight,
      width: window.innerWidth,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    (
      window as unknown as {
        accountKeyboard: (height: number, offset?: number) => void;
      }
    ).accountKeyboard = (height, offset = 0) => {
      viewport.height = height;
      viewport.offsetTop = offset;
      viewport.pageTop = offset;
      viewport.dispatchEvent(new Event("resize"));
    };
  });
}
async function keyboardViewport(page: Page, height: number, offset = 0) {
  await page.evaluate(
    ({ height, offset }) =>
      (
        window as unknown as {
          accountKeyboard: (height: number, offset: number) => void;
        }
      ).accountKeyboard(height, offset),
    { height, offset },
  );
}
async function aboveKeyboard(page: Page, name: string, bottom: number) {
  const button = page.getByRole("button", { name, exact: true });
  await expect
    .poll(async () => {
      const box = await button.boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= bottom + 1;
    })
    .toBe(true);
}
for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme}: login and signup actions remain above a mobile Safari keyboard`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    const fixture = await prepare(page, { guest: true });
    fixture.release();
    await emulateAccountKeyboard(page);
    await page.goto("./auth");
    await expect(page.getByTestId("launch-overlay")).toHaveCount(0);
    await page
      .getByLabel("E-posta", { exact: true })
      .fill("keyboard@example.invalid");
    await page.getByLabel("Şifre", { exact: true }).fill("fixture-password");
    await keyboardViewport(page, 480);
    await aboveKeyboard(page, "Giriş yap", 480);
    await expect(page.getByLabel("Şifre", { exact: true })).toBeFocused();
    await keyboardViewport(page, 360);
    await aboveKeyboard(page, "Giriş yap", 360);
    await expect(page.getByLabel("Şifre", { exact: true })).toBeFocused();
    await keyboardViewport(page, 480, 60);
    await aboveKeyboard(page, "Giriş yap", 540);
    await keyboardViewport(page, 844);
    await page.getByRole("tab", { name: "Üye ol", exact: true }).click();
    await page
      .getByLabel("E-posta", { exact: true })
      .fill("keyboard@example.invalid");
    await keyboardViewport(page, 480);
    await aboveKeyboard(page, "Devam et", 480);
    await keyboardViewport(page, 844);
    await page.getByRole("button", { name: "Devam et", exact: true }).click();
    await page.getByLabel("Kullanıcı adı", { exact: true }).fill("ornek_yolcu");
    await page
      .getByLabel("Şifre · en az 8 karakter", { exact: true })
      .fill("fixture-password");
    await keyboardViewport(page, 480);
    await aboveKeyboard(page, "Devam et", 480);
  });
}
test("social profile setup stays scrollable with the keyboard open", async ({
  page,
}) => {
  const fixture = await prepare(page, { onboarding: true });
  fixture.release();
  await emulateAccountKeyboard(page);
  await page.goto("./");
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill("ornek_yolcu");
  await keyboardViewport(page, 480);
  await aboveKeyboard(page, "Devam et", 480);
  await keyboardViewport(page, 844);
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await page.getByLabel("Adın", { exact: true }).fill("Örnek Yolcu");
  await keyboardViewport(page, 480);
  await expect
    .poll(async () => {
      const box = await page.getByLabel("Adın", { exact: true }).boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= 481;
    })
    .toBe(true);
  await page.getByTestId("keyboard-form").evaluate((element) => {
    const scroll = [...element.querySelectorAll("div")].find(
      (node) =>
        getComputedStyle(node).overflowY === "auto" &&
        node.scrollHeight > node.clientHeight,
    );
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });
  await aboveKeyboard(page, "Hesabımı tamamla", 480);
});
