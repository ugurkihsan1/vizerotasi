import { expect, it } from "vitest";
import { socialAuthenticationTime } from "../supabase/functions/_shared/social-session";

it("uses the session's OAuth authentication time, ignoring password and refresh timestamps", () => {
  expect(
    socialAuthenticationTime([
      { method: "oauth", timestamp: 100 },
      { method: "token_refresh", timestamp: 300 },
      { method: "password", timestamp: 400 },
    ]),
  ).toBe(100000);
});

it("does not treat missing or malformed authentication details as a fresh sign-in", () => {
  for (const amr of [
    undefined,
    [],
    ["oauth"],
    [{ method: "oauth", timestamp: "100" }],
    [{ method: "oauth", timestamp: NaN }],
  ])
    expect(socialAuthenticationTime(amr)).toBeNull();
});
