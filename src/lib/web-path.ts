/** Project Pages uses a subdirectory; local development and root hosting do not. */
export function webPath(path: string) {
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? "").replace(/\/$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}
