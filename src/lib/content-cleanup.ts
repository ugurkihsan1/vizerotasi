import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./supabase";
const key = (userId: string) => `pending-evidence-cleanup:${userId}`;
export async function pendingCleanup(userId: string): Promise<string[]> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(key(userId))) ?? "[]");
    return Array.isArray(v)
      ? v.filter((x) => typeof x === "string" && x.startsWith(userId + "/"))
      : [];
  } catch {
    return [];
  }
}
export async function queueCleanup(userId: string, paths: string[]) {
  const all = [
    ...new Set([
      ...(await pendingCleanup(userId)),
      ...paths.filter((x) => x.startsWith(userId + "/")),
    ]),
  ];
  await AsyncStorage.setItem(key(userId), JSON.stringify(all));
}
export async function cleanupEvidence(userId: string) {
  const paths = await pendingCleanup(userId);
  if (!paths.length) return;
  const r = await db().storage.from("post-evidence").remove(paths);
  if (r.error) throw r.error;
  await AsyncStorage.removeItem(key(userId));
}
