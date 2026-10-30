import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { resolve } from "node:path";

const args = Object.fromEntries(
  Array.from({ length: Math.floor((process.argv.length - 2) / 2) }, (_, i) => [
    process.argv[2 + i * 2],
    process.argv[3 + i * 2],
  ]),
);
const team = args["--team-id"],
  keyId = args["--key-id"],
  keyFile = args["--key-file"],
  output = args["--output"];
if (!team || !keyId || !keyFile || !output) {
  console.error(
    "Usage: node scripts/apple-client-secret.mjs --team-id TEAM_ID --key-id KEY_ID --key-file /tmp/AuthKey.p8 --client-id com.vizesel.app --output /tmp/apple-native-secret.txt",
  );
  process.exit(1);
}
const now = Math.floor(Date.now() / 1000),
  expires = now + 180 * 86400;
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const message =
  encode({ alg: "ES256", kid: keyId, typ: "JWT" }) +
  "." +
  encode({
    iss: team,
    iat: now,
    exp: expires,
    aud: "https://appleid.apple.com",
    sub: args["--client-id"] ?? "com.vizesel.app",
  });
const key = createPrivateKey(readFileSync(resolve(keyFile)));
const signature = sign("sha256", Buffer.from(message), {
  key,
  dsaEncoding: "ieee-p1363",
}).toString("base64url");
writeFileSync(resolve(output), `${message}.${signature}`, {
  mode: 0o600,
  flag: "wx",
});
console.log(
  `Secret saved to ${resolve(output)}. Expires ${new Date(expires * 1000).toISOString()}. Keep it out of Git and client environment variables.`,
);
