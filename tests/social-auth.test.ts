import { beforeEach, expect, it, vi } from "vitest";
import { signInSocial } from "../src/lib/social-auth";

const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" },
  oauth: vi.fn(),
  idToken: vi.fn(),
  setSession: vi.fn(),
  updateUser: vi.fn(),
  browser: vi.fn(),
  apple: vi.fn(),
  available: vi.fn(),
  digest: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo-linking", () => ({
  createURL: () => "vizerotasi://auth?oauth=1",
}));
vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: mocks.browser,
}));
vi.mock("expo-apple-authentication", () => ({
  isAvailableAsync: mocks.available,
  signInAsync: mocks.apple,
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  formatFullName: () => "Örnek Yolcu",
}));
vi.mock("expo-crypto", () => ({
  randomUUID: () => "random-fixture-value",
  digestStringAsync: mocks.digest,
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({
    auth: {
      signInWithOAuth: mocks.oauth,
      signInWithIdToken: mocks.idToken,
      setSession: mocks.setSession,
      updateUser: mocks.updateUser,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.platform.OS = "ios";
  mocks.available.mockResolvedValue(true);
  mocks.digest.mockResolvedValue("hashed-nonce");
  mocks.apple.mockResolvedValue({
    identityToken: "apple-id-token",
    state: "random-fixture-value",
    fullName: {},
  });
  mocks.idToken.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.setSession.mockResolvedValue({ error: null });
  mocks.oauth.mockResolvedValue({
    data: { url: "https://auth.example.invalid/authorize" },
    error: null,
  });
  mocks.browser.mockResolvedValue({
    type: "success",
    url: "vizerotasi://auth?oauth=1#access_token=access&refresh_token=refresh",
  });
});

it("uses the native Apple identity token with a hashed challenge and original nonce", async () => {
  expect(await signInSocial("apple")).toBe("signed-in");
  expect(mocks.apple).toHaveBeenCalledWith(
    expect.objectContaining({
      nonce: "hashed-nonce",
      state: "random-fixture-value",
    }),
  );
  expect(mocks.idToken).toHaveBeenCalledWith({
    provider: "apple",
    token: "apple-id-token",
    nonce: "random-fixture-value",
  });
  expect(mocks.oauth).not.toHaveBeenCalled();
});

it("does not sign in after Apple cancellation or a mismatched state", async () => {
  mocks.apple.mockRejectedValueOnce({ code: "ERR_REQUEST_CANCELED" });
  expect(await signInSocial("apple")).toBe("cancelled");
  mocks.apple.mockResolvedValueOnce({ identityToken: "token", state: "wrong" });
  await expect(signInSocial("apple")).rejects.toMatchObject({
    code: "social_auth_failed",
  });
  expect(mocks.idToken).not.toHaveBeenCalled();
});

it("completes Google in the system authentication browser and persists its session", async () => {
  expect(await signInSocial("google")).toBe("signed-in");
  expect(mocks.oauth).toHaveBeenCalledWith({
    provider: "google",
    options: {
      redirectTo: "vizerotasi://auth?oauth=1",
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  expect(mocks.setSession).toHaveBeenCalledWith({
    access_token: "access",
    refresh_token: "refresh",
  });
});

it("treats browser dismissal as cancellation and rejects provider errors or missing tokens", async () => {
  mocks.browser.mockResolvedValueOnce({ type: "cancel" });
  expect(await signInSocial("google")).toBe("cancelled");
  mocks.browser.mockResolvedValueOnce({
    type: "success",
    url: "vizerotasi://auth#error=access_denied",
  });
  await expect(signInSocial("google")).rejects.toMatchObject({
    code: "access_denied",
  });
  mocks.browser.mockResolvedValueOnce({
    type: "success",
    url: "vizerotasi://auth?oauth=1",
  });
  await expect(signInSocial("google")).rejects.toMatchObject({
    code: "social_auth_failed",
  });
  expect(mocks.setSession).not.toHaveBeenCalled();
});

it("redirects web users to the provider and leaves callback consumption to the web SDK", async () => {
  mocks.platform.OS = "web";
  const assign = vi.fn();
  vi.stubGlobal("window", {
    location: { origin: "https://example.invalid", assign },
  });
  try {
    expect(await signInSocial("apple")).toBe("redirecting");
    expect(assign).toHaveBeenCalledWith(
      "https://auth.example.invalid/authorize",
    );
    expect(mocks.browser).not.toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
