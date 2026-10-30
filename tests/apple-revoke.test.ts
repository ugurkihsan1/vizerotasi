import { expect, it, vi } from "vitest";
import {
  revokeAppleAuthorization,
  type AppleTransport,
} from "../supabase/functions/_shared/apple-revoke";

it("exchanges a fresh code, then revokes the refresh token with the native client ID", async () => {
  const transport = vi
    .fn<AppleTransport>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ refresh_token: "fixture-refresh" })),
    )
    .mockResolvedValueOnce(new Response(""));
  await revokeAppleAuthorization(
    "fixture-code",
    "com.vizesel.app",
    "fixture-secret",
    transport,
  );
  expect(transport.mock.calls[0][0]).toBe(
    "https://appleid.apple.com/auth/token",
  );
  expect(transport.mock.calls[0][1]?.body?.toString()).toContain(
    "code=fixture-code",
  );
  expect(transport.mock.calls[1][0]).toBe(
    "https://appleid.apple.com/auth/revoke",
  );
  expect(transport.mock.calls[1][1]?.body?.toString()).toContain(
    "token=fixture-refresh",
  );
  expect(transport.mock.calls[1][1]?.body?.toString()).toContain(
    "client_id=com.vizesel.app",
  );
});

it("does not pretend revocation succeeded when Apple refuses or server credentials are absent", async () => {
  const transport = vi
    .fn<AppleTransport>()
    .mockResolvedValue(new Response("", { status: 400 }));
  await expect(
    revokeAppleAuthorization("code", "app", "", transport),
  ).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
  await expect(
    revokeAppleAuthorization("code", "app", "secret", transport),
  ).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
});
