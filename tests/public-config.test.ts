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
it("rejects environment overrides pointing to a different project", () => {
  const override = {
    url: "https://other.supabase.co",
    key: "sb_publishable_other_fixture_public_key",
  };
  expect(resolvePublicConfig(override, fallback)).toEqual({
    url: fallback.url,
    key: fallback.publishableKey,
  });
  expect(resolvePublicConfig({ url: override.url }, fallback)?.url).toBe(
    fallback.url,
  );
});
it("allows key rotation for the pinned project only", () => {
  const override = {
    url: fallback.url + "/",
    key: "sb_publishable_rotated_fixture_public_key",
  };
  expect(resolvePublicConfig(override, fallback)).toEqual({
    ...override,
    url: fallback.url,
  });
});
it("rejects non-Supabase, credential-bearing and nonstandard port endpoints", () => {
  for (const url of [
    "https://evil.example",
    "https://test-project.supabase.co.evil.example",
    "https://evil.example@" + new URL(fallback.url).host,
    "https://user:secret@" + new URL(fallback.url).host,
    fallback.url + ":8443",
  ])
    expect(isPublicSupabaseConfig(url, fallback.publishableKey)).toBe(false);
});
