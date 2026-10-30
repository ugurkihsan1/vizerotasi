import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "../lib/auth";
import { usePrivacyPreferences } from "../lib/privacy";
import { db } from "../lib/supabase";
import {
  acknowledgeWithdrawal,
  pendingWithdrawals,
} from "../lib/privacy-receipts";

let receipt: { key: string; status: "pending" | "saved" | "failed" } | null =
  null;
let retry: (() => void) | undefined;
export function retryPrivacyReceipt() {
  retry?.();
}
const listeners = new Set<() => void>();
function setReceipt(value: typeof receipt) {
  receipt = value;
  listeners.forEach((listener) => listener());
}
export function usePrivacyReceipt() {
  const { session } = useAuth();
  const { preferences } = usePrivacyPreferences();
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return receipt?.key === `${session?.user.id}:${preferences?.acknowledgedAt}`
    ? receipt.status
    : "pending";
}
export function PrivacySync() {
  const { session, profile } = useAuth();
  const { preferences } = usePrivacyPreferences();
  const user = session?.user.id;
  const canSync = !!profile && !profile.needs_onboarding;
  useEffect(() => {
    if (!user || !preferences || !canSync) return;
    const connection = db();
    const key = `${user}:${preferences.acknowledgedAt}`;
    let active = true;
    let inFlight = false;
    const sync = async () => {
      if (
        !active ||
        inFlight ||
        (receipt?.key === key && receipt.status === "saved")
      )
        return;
      inFlight = true;
      setReceipt({ key, status: "pending" });
      try {
        for (const pending of await pendingWithdrawals(user)) {
          const sent = await connection.rpc("record_legal_preferences", {
            preference_payload: {
              ...pending.preferences,
              source: Platform.OS === "web" ? "web" : "native",
            },
          });
          if (sent.error) throw sent.error;
          await acknowledgeWithdrawal(user, pending.preferences.acknowledgedAt);
        }
        if (!active) return;
        const result = await connection.rpc("record_legal_preferences", {
          preference_payload: {
            ...preferences,
            source: Platform.OS === "web" ? "web" : "native",
          },
        });
        if (result.error) throw result.error;
        if (active) setReceipt({ key, status: "saved" });
      } catch {
        if (active) setReceipt({ key, status: "failed" });
      } finally {
        inFlight = false;
      }
    };
    void sync();
    retry = () => {
      void sync();
    };
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => {
      active = false;
      retry = undefined;
      foreground.remove();
    };
  }, [user, preferences, canSync]);
  return null;
}
