import { beforeEach, expect, it, vi } from "vitest";
import type { PrivacyPreferences } from "../src/lib/privacy";
import {
  acknowledgeWithdrawal,
  pendingWithdrawals,
  queueWithdrawal,
  withdrawalStorageKey,
} from "../src/lib/privacy-receipts";

const storage = vi.hoisted(() => ({
  values: new Map<string, string>(),
  failRead: false,
  failWrite: false,
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => {
      if (storage.failRead) throw new Error("read failed");
      return storage.values.get(key) ?? null;
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      if (storage.failWrite) throw new Error("write failed");
      storage.values.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      if (storage.failWrite) throw new Error("write failed");
      storage.values.delete(key);
    }),
  },
}));

function choice(index = 0): PrivacyPreferences {
  return {
    privacyVersion: "2026-10-29.1",
    transferVersion: "2026-10-29.1",
    supabase: false,
    google: false,
    github: false,
    acknowledgedAt: new Date(Date.UTC(2026, 9, 29) + index).toISOString(),
  };
}
beforeEach(() => {
  storage.values.clear();
  storage.failRead = false;
  storage.failWrite = false;
  vi.clearAllMocks();
});

it("persists idempotent withdrawal instructions without storing tokens or unknown fields", async () => {
  const event = { ...choice(), accessToken: "secret", refresh_token: "secret" };
  await queueWithdrawal("account-a", event);
  await queueWithdrawal("account-a", choice());
  expect(await pendingWithdrawals("account-a")).toEqual([
    { userId: "account-a", preferences: choice() },
  ]);
  expect(storage.values.get(withdrawalStorageKey)).not.toContain("secret");
  expect(await pendingWithdrawals("account-b")).toEqual([]);
});

it("serializes concurrent updates and acknowledges only the matching account and event", async () => {
  await Promise.all([
    queueWithdrawal("account-a", choice()),
    queueWithdrawal("account-a", choice(1)),
    queueWithdrawal("account-b", choice()),
  ]);
  await acknowledgeWithdrawal("account-a", choice().acknowledgedAt);
  expect(await pendingWithdrawals("account-a")).toEqual([
    { userId: "account-a", preferences: choice(1) },
  ]);
  expect(await pendingWithdrawals("account-b")).toHaveLength(1);
  await acknowledgeWithdrawal("account-a", choice().acknowledgedAt);
  await acknowledgeWithdrawal("account-a", choice(1).acknowledgedAt);
  await acknowledgeWithdrawal("account-b", choice().acknowledgedAt);
  expect(storage.values.has(withdrawalStorageKey)).toBe(false);
});

it("keeps older policy versions and rejects conflicting duplicates rather than overwriting", async () => {
  const original = {
    ...choice(),
    privacyVersion: "older",
    transferVersion: "older",
  };
  await queueWithdrawal("account-a", original);
  await expect(queueWithdrawal("account-a", choice())).rejects.toThrow(
    "privacy_withdrawal_conflict",
  );
  expect((await pendingWithdrawals("account-a"))[0].preferences).toEqual(
    original,
  );
});

it("surfaces storage failures and corruption without erasing unreported instructions", async () => {
  await queueWithdrawal("account-a", choice());
  const original = storage.values.get(withdrawalStorageKey);
  storage.failWrite = true;
  await expect(queueWithdrawal("account-a", choice(1))).rejects.toThrow(
    "write failed",
  );
  await expect(
    acknowledgeWithdrawal("account-a", choice().acknowledgedAt),
  ).rejects.toThrow("write failed");
  expect(storage.values.get(withdrawalStorageKey)).toBe(original);
  storage.failRead = true;
  await expect(pendingWithdrawals("account-a")).rejects.toThrow("read failed");
  storage.failRead = false;
  storage.failWrite = false;
  storage.values.set(withdrawalStorageKey, "corrupt");
  await expect(queueWithdrawal("account-a", choice(2))).rejects.toThrow(
    "privacy_withdrawal_storage_invalid",
  );
  expect(storage.values.get(withdrawalStorageKey)).toBe("corrupt");
});

it("rejects malformed new events and a full queue without evicting another account", async () => {
  await expect(queueWithdrawal("", choice())).rejects.toThrow();
  await expect(
    queueWithdrawal("account-a", {
      ...choice(),
      supabase: "false",
    } as unknown as PrivacyPreferences),
  ).rejects.toThrow();
  await expect(
    queueWithdrawal("account-a", { ...choice(), acknowledgedAt: "now" }),
  ).rejects.toThrow();
  const events = Array.from({ length: 256 }, (_, index) => ({
    userId: "account-a",
    preferences: choice(index),
  }));
  events.push({ userId: "account-b", preferences: choice() });
  const original = JSON.stringify(events);
  storage.values.set(withdrawalStorageKey, original);
  await expect(queueWithdrawal("account-a", choice(300))).rejects.toThrow(
    "privacy_withdrawal_queue_full",
  );
  expect(storage.values.get(withdrawalStorageKey)).toBe(original);
  expect(await pendingWithdrawals("account-b")).toHaveLength(1);
});
