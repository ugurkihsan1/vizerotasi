import { beforeEach, expect, it, vi } from "vitest";
import { nativeGoogleIdToken } from "../src/lib/native-google.native";

const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" },
  configure: vi.fn(),
  signIn: vi.fn(),
  services: vi.fn(),
  config: {
    iosClientId: "fixture-ios.apps.googleusercontent.com" as string | null,
    webClientId: "fixture-web.apps.googleusercontent.com",
  },
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("../src/config/google-signin.public.json", () => ({
  default: mocks.config,
}));
vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: mocks.configure,
    signIn: mocks.signIn,
    hasPlayServices: mocks.services,
  },
  isErrorWithCode: (error: { code?: string }) =>
    typeof error?.code === "string",
  statusCodes: { SIGN_IN_CANCELLED: "cancelled" },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.platform.OS = "ios";
  mocks.config.iosClientId = "fixture-ios.apps.googleusercontent.com";
  mocks.signIn.mockResolvedValue({
    type: "success",
    data: { idToken: "fixture-id-token" },
  });
});

it("gets Google's native identity token with the correct public client IDs", async () => {
  expect(await nativeGoogleIdToken()).toBe("fixture-id-token");
  expect(mocks.configure).toHaveBeenCalledWith({
    iosClientId: mocks.config.iosClientId,
    webClientId: mocks.config.webClientId,
    offlineAccess: false,
  });
  expect(mocks.services).not.toHaveBeenCalled();
});
it("handles dismissal without signing in and rejects a response without an ID token", async () => {
  mocks.signIn.mockResolvedValueOnce({ type: "cancelled" });
  expect(await nativeGoogleIdToken()).toBeNull();
  mocks.signIn.mockRejectedValueOnce({ code: "cancelled" });
  expect(await nativeGoogleIdToken()).toBeNull();
  mocks.signIn.mockResolvedValueOnce({
    type: "success",
    data: { idToken: null },
  });
  await expect(nativeGoogleIdToken()).rejects.toMatchObject({
    code: "social_auth_failed",
  });
});
it("fails safely before opening a browser or starting the SDK if the iOS client is missing", async () => {
  mocks.config.iosClientId = null;
  await expect(nativeGoogleIdToken()).rejects.toMatchObject({
    code: "google_native_not_configured",
  });
  expect(mocks.configure).not.toHaveBeenCalled();
  expect(mocks.signIn).not.toHaveBeenCalled();
});
it("checks Google Play Services on Android", async () => {
  mocks.platform.OS = "android";
  await nativeGoogleIdToken();
  expect(mocks.services).toHaveBeenCalledWith({
    showPlayServicesUpdateDialog: true,
  });
});
