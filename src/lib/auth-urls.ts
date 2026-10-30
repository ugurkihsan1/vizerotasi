/** Reject untrusted URLs before handing them to the browser or consuming tokens. */
function parseUrl(value: string): URL | null {
  if (!value || value !== value.trim() || /[\u0000-\u0020\u007f\\]/.test(value))
    return null;
  try {
    const url = new URL(value);
    return url.username || url.password ? null : url;
  } catch {
    return null;
  }
}

export function isTrustedOAuthUrl(
  value: string,
  projectUrl: string,
  provider: "apple" | "google",
  redirectTo: string,
): boolean {
  const url = parseUrl(value);
  const project = parseUrl(projectUrl);
  if (
    !url ||
    !project ||
    url.protocol !== "https:" ||
    url.origin !== project.origin ||
    url.pathname !== "/auth/v1/authorize" ||
    url.hash
  )
    return false;
  const allowed = new Set([
    "provider",
    "redirect_to",
    "scopes",
    "prompt",
    "code_challenge",
    "code_challenge_method",
    "skip_http_redirect",
  ]);
  for (const key of url.searchParams.keys())
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1)
      return false;
  return (
    url.searchParams.get("provider") === provider &&
    url.searchParams.get("redirect_to") === redirectTo &&
    (!url.searchParams.has("skip_http_redirect") ||
      url.searchParams.get("skip_http_redirect") === "true")
  );
}

export function isTrustedAuthReturnUrl(
  value: string,
  expected: string,
): boolean {
  const url = parseUrl(value);
  const target = parseUrl(expected);
  if (
    !url ||
    !target ||
    url.protocol !== target.protocol ||
    url.host !== target.host ||
    url.pathname !== target.pathname
  )
    return false;
  // Preserve the requested flow flags; callback tokens/errors may be appended.
  for (const [key, expectedValue] of target.searchParams)
    if (
      url.searchParams.getAll(key).length !== 1 ||
      url.searchParams.get(key) !== expectedValue
    )
      return false;
  return true;
}
