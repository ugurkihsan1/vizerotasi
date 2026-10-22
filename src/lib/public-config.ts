export function isPublicSupabaseConfig(
  url: string | undefined,
  key: string | undefined,
): boolean {
  if (!url || !key) return false;
  try {
    const parsed = new URL(url.trim());
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      !["", "/"].includes(parsed.pathname) ||
      parsed.search ||
      parsed.hash
    )
      return false;
    if (key.startsWith("sb_publishable_")) return key.length > 25;
    if (key.split(".").length === 3) {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      return payload.role === "anon";
    }
  } catch {
    return false;
  }
  return false;
}
export function resolvePublicConfig(
  environment: { url?: string; key?: string },
  fallback: { url: string; publishableKey: string },
) {
  const selected = isPublicSupabaseConfig(environment.url, environment.key)
    ? { url: environment.url!, key: environment.key! }
    : { url: fallback.url, key: fallback.publishableKey };
  return isPublicSupabaseConfig(selected.url, selected.key)
    ? { url: selected.url.trim().replace(/\/$/, ""), key: selected.key.trim() }
    : null;
}
