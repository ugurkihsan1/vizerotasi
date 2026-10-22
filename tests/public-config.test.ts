import { it, expect } from "vitest";
import {
  isPublicSupabaseConfig,
  resolvePublicConfig,
} from "../src/lib/public-config";
const fallback = {
  url: "https://test-project.supabase.co",
  publishableKey: "sb_publishable_test_fixture_not_a_real_key",
};
it("uses the public project config when Netlify variables are absent", () =>
  expect(resolvePublicConfig({}, fallback)).toEqual({
    url: fallback.url,
    key: fallback.publishableKey,
  }));
it("rejects reversed fields and service-role secrets", () => {
  expect(isPublicSupabaseConfig(fallback.publishableKey, fallback.url)).toBe(
    false,
  );
  expect(
    isPublicSupabaseConfig(fallback.url, "sb_secret_fixture_never_bundle"),
  ).toBe(false);
  expect(
    isPublicSupabaseConfig(fallback.url + "/rest/v1", fallback.publishableKey),
  ).toBe(false);
});
it("supports a coherent project override without mixing projects", () => {
  const override = {
    url: "https://other.supabase.co",
    key: "sb_publishable_other_fixture_public_key",
  };
  expect(resolvePublicConfig(override, fallback)).toEqual(override);
  expect(resolvePublicConfig({ url: override.url }, fallback)?.url).toBe(
    fallback.url,
  );
});
