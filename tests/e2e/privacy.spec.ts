import { test, expect, type Page } from "@playwright/test";
import {
  legalDocument,
  privacyVersion,
  transferVersion,
} from "../../src/content/legal";

const preferenceKey = "vizesel-privacy-preferences-v1";
const authKey = "sb-ebnkdgvngufxarkwiyxt-auth-token";
const ownId = "00000000-0000-0000-0000-000000000200";
const user = {
  id: ownId,
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-10-01T00:00:00Z",
};

function session(expired = false) {
  const exp = Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600);
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: ownId, exp, aud: "authenticated", role: "authenticated" })).toString("base64url")}.fixture-signature`;
  return {
    access_token: token,
    refresh_token: "fixture-refresh",
    expires_at: exp,
    expires_in: 3600,
    token_type: "bearer",
    user,
  };
}

async function transport(page: Page, emailVerified = false) {
  const requests: { path: string; method: string; body: unknown }[] = [];
  const sockets: string[] = [];
  await page.routeWebSocket(/supabase\.co/, (socket) => {
    sockets.push(new URL(socket.url()).pathname);
    socket.onMessage((raw) => {
      const frame = JSON.parse(String(raw));
      const [joinRef, ref, topic, event, payload] = Array.isArray(frame)
        ? frame
        : [frame.join_ref, frame.ref, frame.topic, frame.event, frame.payload];
      const reply = (event: string, payload: unknown) =>
        socket.send(
          JSON.stringify(
            Array.isArray(frame)
              ? [joinRef, ref, topic, event, payload]
              : { join_ref: joinRef, ref, topic, event, payload },
          ),
        );
      if (event === "phx_join")
        reply("phx_reply", {
          status: "ok",
          response: {
            postgres_changes: (payload.config?.postgres_changes ?? []).map(
              (binding: Record<string, unknown>, index: number) => ({
                ...binding,
                id: index + 1,
              }),
            ),
          },
        });
      else if (event === "heartbeat" || event === "phx_leave")
        reply("phx_reply", { status: "ok", response: {} });
    });
  });
  await page.route("https://*.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push({
      path,
      method: request.method(),
      body: request.postData() ? request.postDataJSON() : null,
    });
    if (path === "/auth/v1/user")
      return route.fulfill({
        json: emailVerified
          ? { ...user, email_confirmed_at: "2026-10-28T10:00:00Z" }
          : user,
      });
    if (path === "/auth/v1/token") return route.fulfill({ json: session() });
    if (path === "/rest/v1/profiles")
      return route.fulfill({
        json: {
          id: ownId,
          username: "fixture_member",
          display_name: "Normal member",
          role: "user",
          membership_level: "Yeni Üye",
          reputation: 0,
          created_at: user.created_at,
        },
      });
    if (path === "/rest/v1/rpc/record_legal_preferences")
      return route.fulfill({ json: null });
    if (path === "/rest/v1/rpc/chat_unread_count")
      return route.fulfill({ json: 0 });
    return route.fulfill({ json: [] });
  });
  await page.addInitScript(() =>
    localStorage.setItem("onboarding-planner-v1", "done"),
  );
  return { requests, sockets };
}

async function chooseRequired(page: Page) {
  await page
    .getByRole("switch", { name: "Gizlilik metnini okudum", exact: true })
    .check();
  await page
    .getByRole("switch", { name: "Supabase aktarımı", exact: true })
    .check();
  await page
    .getByRole("switch", { name: "GitHub Pages aktarımı", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Tercihlerimi kaydet", exact: true })
    .click();
}

test("privacy gate starts unselected and blocks Supabase until the required choices", async ({
  page,
}) => {
  const state = await transport(page);
  await page.goto("/");
  const save = page.getByRole("button", {
    name: "Tercihlerimi kaydet",
    exact: true,
  });
  await expect(save).toBeVisible();
  for (const name of [
    "Gizlilik metnini okudum",
    "Supabase aktarımı",
    "Google/Gmail aktarımı",
    "GitHub Pages aktarımı",
  ])
    await expect(
      page.getByRole("switch", { name, exact: true }),
    ).not.toBeChecked();
  if (await save.isEnabled()) await save.click();
  else await expect(save).toBeDisabled();
  await expect(save).toBeVisible();
  expect(state.requests).toHaveLength(0);
  expect(state.sockets).toHaveLength(0);

  await page
    .getByRole("switch", { name: "Gizlilik metnini okudum", exact: true })
    .check();
  await page
    .getByRole("switch", { name: "Supabase aktarımı", exact: true })
    .check();
  if (await save.isEnabled()) await save.click();
  else await expect(save).toBeDisabled();
  await expect(save).toBeVisible();
  expect(state.requests).toHaveLength(0);
  expect(state.sockets).toHaveLength(0);

  await page
    .getByRole("switch", { name: "GitHub Pages aktarımı", exact: true })
    .check();
  await save.click();
  await expect(
    page.getByText("Henüz paylaşım yok", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => state.requests.length).toBeGreaterThan(0);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    preferenceKey,
  );
  expect(stored).toMatchObject({
    privacyVersion,
    transferVersion,
    supabase: true,
    github: true,
    google: false,
  });
  expect(Number.isNaN(Date.parse(stored.acknowledgedAt))).toBe(false);
});

test("an expired saved session cannot refresh before privacy choices", async ({
  page,
}) => {
  const state = await transport(page);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: authKey, value: session(true) },
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tercihlerimi kaydet", exact: true }),
  ).toBeVisible();
  // Give eager Auth initialization enough time to expose a premature refresh.
  await page.waitForTimeout(500);
  expect(state.requests).toHaveLength(0);
  expect(state.sockets).toHaveLength(0);
  await chooseRequired(page);
  await expect
    .poll(() =>
      state.requests.some((request) => request.path === "/auth/v1/token"),
    )
    .toBe(true);
});

for (const type of ["signup", "recovery"] as const) {
  test(`email ${type} callback survives waiting for initial privacy choices`, async ({
    page,
  }) => {
    const state = await transport(page, true);
    const token = session().access_token;
    await page.goto(
      `/auth#access_token=${token}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=${type}`,
    );
    await expect(
      page.getByRole("button", { name: "Tercihlerimi kaydet", exact: true }),
    ).toBeVisible();
    expect(state.requests).toHaveLength(0);
    expect(state.sockets).toHaveLength(0);
    await chooseRequired(page);
    if (type === "recovery") {
      await expect(page.getByText("Yeni şifre", { exact: true })).toBeVisible();
      await expect(
        page.getByText("E-posta adresin doğrulandı", { exact: true }),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByText("E-posta adresin doğrulandı", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("E-posta", { exact: true })).toHaveCount(0);
    }
  });
}

test("legal pages are readable without initializing Supabase", async ({
  page,
}) => {
  const state = await transport(page);
  for (const document of ["privacy", "transfer", "terms"] as const) {
    await page.goto(`/legal/${document}`);
    await expect(
      page.getByText(legalDocument(document)!.title, { exact: true }),
    ).toBeVisible();
    expect(state.requests).toHaveLength(0);
    expect(state.sockets).toHaveLength(0);
  }
});

test("outdated privacy versions require a new choice before requests", async ({
  page,
}) => {
  const state = await transport(page);
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          privacyVersion: "outdated",
          transferVersion: "outdated",
          supabase: true,
          google: true,
          github: true,
          acknowledgedAt: "2026-01-01T00:00:00Z",
        }),
      ),
    preferenceKey,
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tercihlerimi kaydet", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Supabase aktarımı", exact: true }),
  ).not.toBeChecked();
  expect(state.requests).toHaveLength(0);
  expect(state.sockets).toHaveLength(0);
});

test("account email stays blocked until the optional Google choice is enabled", async ({
  page,
}) => {
  const state = await transport(page);
  await page.goto("/auth");
  await chooseRequired(page);
  await page
    .getByRole("link", { name: "Şifremi unuttum", exact: true })
    .click();
  await page.getByLabel("E-posta", { exact: true }).fill("fixture@example.com");
  await page
    .getByRole("button", { name: "Yenileme bağlantısı gönder", exact: true })
    .click();
  await expect(page.getByText(/E-posta göndermek için Ayarlar/)).toBeVisible();
  expect(
    state.requests.filter((request) => request.path === "/auth/v1/recover"),
  ).toHaveLength(0);
  await page
    .getByRole("button", { name: "E-posta tercihini yönet", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Google/Gmail aktarımı", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("switch", { name: "Google/Gmail aktarımı", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Tercihlerimi kaydet", exact: true })
    .click();
  expect(
    state.requests.filter((request) => request.path === "/auth/v1/recover"),
  ).toHaveLength(0);
  await page
    .getByRole("button", { name: "Yenileme bağlantısı gönder", exact: true })
    .click();
  await expect
    .poll(
      () =>
        state.requests.filter((request) => request.path === "/auth/v1/recover")
          .length,
    )
    .toBe(1);
});

test("withdrawing preferences in one tab also stops the other tab", async ({
  page,
  context,
}) => {
  await transport(page);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: authKey, value: session() },
  );
  await page.goto("/settings");
  await chooseRequired(page);
  await page
    .getByRole("button", { name: "Gizlilik ve izinler", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tercihleri yönet", exact: true })
    .click();

  const other = await context.newPage();
  const otherState = await transport(other);
  await other.goto("/");
  await expect(
    other.getByText("Henüz paylaşım yok", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => otherState.sockets.length).toBeGreaterThan(0);
  await other.waitForLoadState("networkidle");
  await page
    .getByRole("button", {
      name: "Aktarım tercihlerini geri çek",
      exact: true,
    })
    .click();
  const requestsBefore = otherState.requests.length;
  const socketsBefore = otherState.sockets.length;
  await page.getByRole("button", { name: "Geri çek", exact: true }).click();
  await expect(
    other.getByRole("switch", { name: "Supabase aktarımı", exact: true }),
  ).not.toBeChecked();
  await page.waitForTimeout(500);
  expect(otherState.requests).toHaveLength(requestsBefore);
  expect(otherState.sockets).toHaveLength(socketsBefore);
  await other.reload();
  await expect(
    other.getByRole("button", { name: "Tercihlerimi kaydet", exact: true }),
  ).toBeVisible();
  expect(otherState.requests).toHaveLength(requestsBefore);
  expect(otherState.sockets).toHaveLength(socketsBefore);
  await other.close();
});

test("withdrawing preferences stops private traffic and remains withdrawn on reload", async ({
  page,
}) => {
  const state = await transport(page);
  await page.addInitScript(
    ({ authKey, preferenceKey, value, privacyVersion, transferVersion }) => {
      if (sessionStorage.getItem("privacy-fixture-seeded")) return;
      sessionStorage.setItem("privacy-fixture-seeded", "yes");
      localStorage.setItem(authKey, JSON.stringify(value));
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({
          privacyVersion,
          transferVersion,
          supabase: true,
          google: true,
          github: true,
          acknowledgedAt: new Date().toISOString(),
        }),
      );
    },
    {
      authKey,
      preferenceKey,
      value: session(),
      privacyVersion,
      transferVersion,
    },
  );
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Gizlilik ve izinler", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tercihleri yönet", exact: true })
    .click();
  await page.evaluate(
    (id) =>
      localStorage.setItem(
        `pending-signup-avatar:v1:${id}`,
        JSON.stringify({
          base64: "private-local-draft",
          mimeType: "image/jpeg",
        }),
      ),
    ownId,
  );
  await page.waitForLoadState("networkidle");
  page.on("dialog", (dialog) => dialog.accept());
  const boundary = state.requests.length;
  const socketBoundary = state.sockets.length;
  await page
    .getByRole("button", {
      name: "Aktarım tercihlerini geri çek",
      exact: true,
    })
    .click();
  const confirm = page.getByRole("button", { name: "Geri çek", exact: true });
  if (await confirm.isVisible()) await confirm.click();
  await expect(
    page.getByRole("switch", { name: "Supabase aktarımı", exact: true }),
  ).not.toBeChecked();
  // A withdrawal receipt is allowed; background profile/chat reads are not.
  await page.waitForTimeout(500);
  const afterWithdrawal = state.requests.slice(boundary);
  expect(
    afterWithdrawal.filter(
      (request) => request.path !== "/rest/v1/rpc/record_legal_preferences",
    ),
  ).toHaveLength(0);
  expect(state.sockets).toHaveLength(socketBoundary);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), authKey),
  ).toBeNull();
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`pending-signup-avatar:v1:${id}`),
      ownId,
    ),
  ).toBeNull();

  const reloadBoundary = state.requests.length;
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tercihlerimi kaydet", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Supabase aktarımı", exact: true }),
  ).not.toBeChecked();
  expect(state.requests).toHaveLength(reloadBoundary);
  expect(state.sockets).toHaveLength(socketBoundary);
});

for (const theme of ["light", "dark"] as const) {
  test(`privacy choices remain readable on a mobile screen in ${theme} mode`, async ({
    page,
  }) => {
    const state = await transport(page);
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
    await page.goto("/");
    const title = page.getByText("Gizlilik tercihlerin", { exact: true });
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(242, 242, 242)" : "rgb(17, 17, 17)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `/tmp/privacy-gate-${theme}.png` });
    expect(state.requests).toHaveLength(0);
    expect(state.sockets).toHaveLength(0);
  });
}
