import { describe, expect, it } from "vitest";
import { authErrorMessage } from "../src/lib/auth-errors";
import { parseAuthCallback } from "../src/lib/auth-callback";

describe("auth errors", () => {
  it("distinguishes a taken username from a server or connection failure", () => {
    expect(authErrorMessage({ code: "username_taken" })).toContain(
      "Bu kullanıcı adı alınmış",
    );
    expect(
      authErrorMessage({
        code: "23505",
        message: 'duplicate key violates "profiles_username_key"',
      }),
    ).toContain("Bu kullanıcı adı alınmış");
    expect(
      authErrorMessage({ code: "unexpected_failure", status: 500 }),
    ).not.toMatch(/bağlantı|kullanıcı adı/i);
    expect(authErrorMessage({ name: "AuthRetryableFetchError" })).toContain(
      "İnternet bağlantını",
    );
    expect(
      authErrorMessage({ status: 503, name: "AuthRetryableFetchError" }),
    ).not.toContain("İnternet");
    expect(authErrorMessage({ status: 429 })).toContain("Çok fazla deneme");
    expect(authErrorMessage({ code: "otp_expired" })).toContain(
      "süresi dolmuş",
    );
    expect(authErrorMessage({ code: "same_password" })).toContain("farklı");
  });
});

describe("verification redirects", () => {
  it("does not treat an arbitrary success flag as a verified email", () => {
    expect(
      parseAuthCallback("https://example.com/auth?confirmed=1"),
    ).toBeNull();
    expect(
      parseAuthCallback("https://example.com/auth#type=signup"),
    ).toBeNull();
  });
  it("distinguishes signup, recovery and failed links", () => {
    const url =
      "https://example.com/auth#access_token=access&refresh_token=refresh&type=";
    expect(parseAuthCallback(url + "signup")).toMatchObject({
      type: "signup",
      error: null,
    });
    expect(parseAuthCallback(url + "recovery")).toMatchObject({
      type: "recovery",
      error: null,
    });
    expect(
      parseAuthCallback(
        "https://example.com/auth#error=access_denied&error_code=otp_expired",
      ),
    ).toMatchObject({ error: "otp_expired" });
    expect(
      parseAuthCallback("https://example.com/auth?error_code=otp_expired"),
    ).toMatchObject({ error: "otp_expired" });
  });
});
