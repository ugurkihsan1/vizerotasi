import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" },
  getItem: vi.fn(),
  setItem: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.getItem, setItem: mocks.setItem },
}));

beforeEach(() => {
  vi.resetModules();
  mocks.platform.OS = "ios";
  mocks.getItem.mockReset().mockResolvedValue(null);
  mocks.setItem.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("privacy preferences at startup", () => {
  it.each(["ios", "android"])(
    "loads on %s when window exists without browser event methods",
    async (os) => {
      mocks.platform.OS = os;
      vi.stubGlobal("window", {});
      const privacy = await import("../src/lib/privacy");
      await expect(privacy.loadPrivacyPreferences()).resolves.toBeUndefined();
      expect(privacy.getPrivacyState()).toMatchObject({
        loaded: true,
        preferences: null,
        error: "",
      });
      expect(mocks.getItem).toHaveBeenCalledWith(privacy.privacyStorageKey);
    },
  );

  it("does not register browser storage listeners on a native window", async () => {
    const addEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener });
    const privacy = await import("../src/lib/privacy");
    await privacy.loadPrivacyPreferences();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("preserves the web cross-tab listener and registers it only once", async () => {
    mocks.platform.OS = "web";
    const addEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener });
    const privacy = await import("../src/lib/privacy");
    await privacy.loadPrivacyPreferences();
    await privacy.loadPrivacyPreferences();
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener.mock.calls[0][0]).toBe("storage");
    const choices = privacy.makePrivacyPreferences({
      supabase: true,
      google: true,
      github: true,
    });
    addEventListener.mock.calls[0][1]({
      key: privacy.privacyStorageKey,
      newValue: JSON.stringify(choices),
    });
    expect(privacy.getPrivacyState().preferences).toEqual(choices);
  });

  it("can load saved choices when browser events are unavailable", async () => {
    mocks.platform.OS = "web";
    vi.stubGlobal("window", {});
    const privacy = await import("../src/lib/privacy");
    await expect(privacy.loadPrivacyPreferences()).resolves.toBeUndefined();
    expect(privacy.getPrivacyState().loaded).toBe(true);
  });
});
