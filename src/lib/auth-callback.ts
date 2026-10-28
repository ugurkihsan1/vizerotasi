/** A redirect parameter alone never proves that an email was verified. */
export function parseAuthCallback(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hash = new URLSearchParams(url.hash.slice(1));
    const type = hash.get("type") ?? url.searchParams.get("type");
    const error =
      hash.get("error_code") ??
      url.searchParams.get("error_code") ??
      hash.get("error") ??
      url.searchParams.get("error");
    const accessToken = hash.get("access_token"),
      refreshToken = hash.get("refresh_token");
    if (error) return { type, error, accessToken: null, refreshToken: null };
    if (!accessToken || !refreshToken) return null;
    return { type, error: null, accessToken, refreshToken };
  } catch {
    return null;
  }
}
