import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { patchGoogleSignInNonce } =
  require("../plugins/with-google-signin-nonce.cjs") as {
    patchGoogleSignInNonce: (source: string) => string;
  };
const original = "additionalScopes:scopes completion:";
const forwarded = 'additionalScopes:scopes nonce:options[@"nonce"] completion:';

it("forwards the caller's nonce into the installed Google iOS SDK and is repeatable", () => {
  const file = require
    .resolve("@react-native-google-signin/google-signin/package.json")
    .replace("package.json", "ios/RNGoogleSignin.mm");
  const source = readFileSync(file, "utf8").replace(forwarded, original);
  const patched = patchGoogleSignInNonce(source);
  expect(patched).not.toBe(source);
  expect(patched).toContain(forwarded);
  expect(patchGoogleSignInNonce(patched)).toBe(patched);
});

it("stops a build if a future native wrapper stops accepting the expected nonce adapter", () => {
  expect(() =>
    patchGoogleSignInNonce("a different native implementation"),
  ).toThrow("update the nonce adapter");
});
