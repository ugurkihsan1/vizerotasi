import { afterEach, expect, it, vi } from "vitest";
import { webPath } from "../src/lib/web-path";
afterEach(() => vi.unstubAllEnvs());
it("keeps local and root-hosted authentication callbacks at the root", () => {
  vi.stubEnv("EXPO_PUBLIC_WEB_BASE_PATH", "");
  expect(new URL(webPath("/auth"), "https://example.com").href).toBe(
    "https://example.com/auth",
  );
});
it("keeps Pages auth callbacks and public documents inside the project directory", () => {
  vi.stubEnv("EXPO_PUBLIC_WEB_BASE_PATH", "/vizerotasi");
  expect(new URL(webPath("/auth"), "https://ugurkihsan1.github.io").href).toBe(
    "https://ugurkihsan1.github.io/vizerotasi/auth",
  );
  expect(webPath("/documents/spain-tourism.pdf")).toBe(
    "/vizerotasi/documents/spain-tourism.pdf",
  );
});
