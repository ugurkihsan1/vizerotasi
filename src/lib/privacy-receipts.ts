import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PrivacyPreferences } from "./privacy";

export const withdrawalStorageKey = "vizesel-pending-privacy-withdrawals-v1";
export interface PendingPrivacyWithdrawal {
  userId: string;
  preferences: PrivacyPreferences;
}

// Keep pending instructions across logout/restart without retaining access or
// refresh tokens. A full queue rejects explicitly; no unreported choice is evicted.
const perUserLimit = 256;
const totalLimit = 2048;
let operation: Promise<void> = Promise.resolve();
function serialized<T>(run: () => Promise<T>): Promise<T> {
  const result = operation.then(run, run);
  operation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function userId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 128 ||
    value !== value.trim()
  )
    throw new Error("privacy_withdrawal_invalid_user");
  return value;
}
function preferences(value: unknown): PrivacyPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("privacy_withdrawal_invalid_preferences");
  const candidate = value as Record<string, unknown>;
  if (
    ![candidate.privacyVersion, candidate.transferVersion].every(
      (version) =>
        typeof version === "string" &&
        version.trim().length > 0 &&
        version.length <= 64,
    ) ||
    typeof candidate.supabase !== "boolean" ||
    typeof candidate.google !== "boolean" ||
    typeof candidate.github !== "boolean" ||
    typeof candidate.acknowledgedAt !== "string" ||
    candidate.acknowledgedAt.length > 48 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      candidate.acknowledgedAt,
    ) ||
    !Number.isFinite(Date.parse(candidate.acknowledgedAt))
  )
    throw new Error("privacy_withdrawal_invalid_preferences");
  // Copy only receipt fields. Never serialize unknown properties such as JWTs.
  return {
    privacyVersion: candidate.privacyVersion as string,
    transferVersion: candidate.transferVersion as string,
    supabase: candidate.supabase,
    google: candidate.google,
    github: candidate.github,
    acknowledgedAt: candidate.acknowledgedAt,
  };
}
async function read(): Promise<PendingPrivacyWithdrawal[]> {
  const raw = await AsyncStorage.getItem(withdrawalStorageKey);
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("privacy_withdrawal_storage_invalid");
  }
  if (!Array.isArray(parsed))
    throw new Error("privacy_withdrawal_storage_invalid");
  return parsed.map((event: unknown) => {
    if (!event || typeof event !== "object")
      throw new Error("privacy_withdrawal_storage_invalid");
    const entry = event as Record<string, unknown>;
    return {
      userId: userId(entry.userId),
      preferences: preferences(entry.preferences),
    };
  });
}

export function queueWithdrawal(
  owner: string,
  value: PrivacyPreferences,
): Promise<void> {
  // Capture a validated immutable copy before an asynchronous storage operation.
  let next: PendingPrivacyWithdrawal;
  try {
    next = { userId: userId(owner), preferences: preferences(value) };
  } catch (error) {
    return Promise.reject(error);
  }
  return serialized(async () => {
    const events = await read();
    const duplicate = events.find(
      (event) =>
        event.userId === next.userId &&
        event.preferences.acknowledgedAt === next.preferences.acknowledgedAt,
    );
    if (duplicate) {
      if (
        JSON.stringify(duplicate.preferences) !==
        JSON.stringify(next.preferences)
      )
        throw new Error("privacy_withdrawal_conflict");
      return;
    }
    if (
      events.length >= totalLimit ||
      events.filter((event) => event.userId === next.userId).length >=
        perUserLimit
    )
      throw new Error("privacy_withdrawal_queue_full");
    await AsyncStorage.setItem(
      withdrawalStorageKey,
      JSON.stringify([...events, next]),
    );
  });
}

/** Returns only this account's pending events; does not perform any network I/O. */
export function pendingWithdrawals(
  owner: string,
): Promise<PendingPrivacyWithdrawal[]> {
  let id: string;
  try {
    id = userId(owner);
  } catch (error) {
    return Promise.reject(error);
  }
  return serialized(async () =>
    (await read()).filter((event) => event.userId === id),
  );
}

/** Call only after the server confirms the corresponding authenticated receipt. */
export function acknowledgeWithdrawal(
  owner: string,
  acknowledgedAt: string,
): Promise<void> {
  let id: string;
  try {
    id = userId(owner);
  } catch (error) {
    return Promise.reject(error);
  }
  if (typeof acknowledgedAt !== "string" || !acknowledgedAt)
    return Promise.reject(new Error("privacy_withdrawal_invalid_timestamp"));
  return serialized(async () => {
    const events = await read();
    const remaining = events.filter(
      (event) =>
        event.userId !== id ||
        event.preferences.acknowledgedAt !== acknowledgedAt,
    );
    if (remaining.length === events.length) return;
    if (remaining.length)
      await AsyncStorage.setItem(
        withdrawalStorageKey,
        JSON.stringify(remaining),
      );
    else await AsyncStorage.removeItem(withdrawalStorageKey);
  });
}
