const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

// GoogleSignIn 9 supports an explicit nonce; the RN 17 wrapper does not forward it.
// Pass our SHA-256 challenge through the existing options dictionary to Google's SDK.
const original =
  "signInWithPresentingViewController:presentingViewController hint:hint additionalScopes:scopes completion:";
const forwarded =
  'signInWithPresentingViewController:presentingViewController hint:hint additionalScopes:scopes nonce:options[@"nonce"] completion:';

function patchGoogleSignInNonce(source) {
  if (source.includes(forwarded)) return source;
  if (!source.includes(original))
    throw new Error(
      "Google Sign-In native wrapper changed; update the nonce adapter before building.",
    );
  return source.replace(original, forwarded);
}

module.exports = function withGoogleSignInNonce(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const root = path.dirname(
        require.resolve(
          "@react-native-google-signin/google-signin/package.json",
          {
            paths: [mod.modRequest.projectRoot],
          },
        ),
      );
      const file = path.join(root, "ios", "RNGoogleSignin.mm");
      const originalSource = fs.readFileSync(file, "utf8");
      const patched = patchGoogleSignInNonce(originalSource);
      if (patched !== originalSource) fs.writeFileSync(file, patched);
      return mod;
    },
  ]);
};
module.exports.patchGoogleSignInNonce = patchGoogleSignInNonce;
