export type AppleTransport = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

/** Exchange a fresh native authorization code and revoke Apple's grant before deleting the account. */
export async function revokeAppleAuthorization(
  authorizationCode: string,
  clientId: string,
  clientSecret: string,
  transport: AppleTransport = fetch,
) {
  if (!clientSecret) throw new Error("Apple deletion configuration missing");
  const response = await transport("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Apple verification failed");
  const tokens = await response.json();
  const token = tokens.refresh_token ?? tokens.access_token;
  if (typeof token !== "string" || !token)
    throw new Error("Apple authorization missing");
  const revoked = await transport("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!revoked.ok) throw new Error("Apple revocation failed");
}
