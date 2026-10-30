/** A token refresh or a login on another device must not count as reauthentication. */
export function socialAuthenticationTime(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null;
  const timestamps = amr.flatMap((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !["oauth", "id_token"].includes(entry.method) ||
      typeof entry.timestamp !== "number" ||
      !Number.isFinite(entry.timestamp)
    )
      return [];
    return [entry.timestamp * 1000];
  });
  return timestamps.length ? Math.max(...timestamps) : null;
}
