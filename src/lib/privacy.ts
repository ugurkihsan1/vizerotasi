import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { privacyVersion, transferVersion } from "../content/legal";

export const privacyStorageKey = "vizesel-privacy-preferences-v1";
export interface PrivacyPreferences {
  privacyVersion: string;
  transferVersion: string;
  supabase: boolean;
  google: boolean;
  github: boolean;
  acknowledgedAt: string;
}
interface State {
  loaded: boolean;
  preferences: PrivacyPreferences | null;
  error: string;
}
let state: State = { loaded: false, preferences: null, error: "" };
let pending: Promise<void> | undefined;
let listening = false;
const listeners = new Set<() => void>();
function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}
export function parsePrivacyPreferences(
  raw: string | null,
): PrivacyPreferences | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (
      !value ||
      value.privacyVersion !== privacyVersion ||
      value.transferVersion !== transferVersion ||
      typeof value.supabase !== "boolean" ||
      typeof value.google !== "boolean" ||
      typeof value.github !== "boolean" ||
      typeof value.acknowledgedAt !== "string" ||
      !Number.isFinite(Date.parse(value.acknowledgedAt))
    )
      return null;
    return {
      privacyVersion,
      transferVersion,
      supabase: value.supabase,
      google: value.google,
      github: value.github,
      acknowledgedAt: value.acknowledgedAt,
    };
  } catch {
    return null;
  }
}
export function getPrivacyState() {
  return state;
}
export function privacyAllowsApp(web: boolean) {
  return !!state.preferences?.supabase && (!web || state.preferences.github);
}
export function usePrivacyPreferences() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getPrivacyState,
    getPrivacyState,
  );
}
export function loadPrivacyPreferences() {
  if (!listening && typeof window !== "undefined") {
    listening = true;
    window.addEventListener("storage", (event) => {
      if (event.key === privacyStorageKey || event.key === null) {
        emit({
          loaded: true,
          preferences: parsePrivacyPreferences(event.newValue),
          error: "",
        });
      }
    });
  }
  return (pending ??= (async () => {
    try {
      const preferences = parsePrivacyPreferences(
        await AsyncStorage.getItem(privacyStorageKey),
      );
      emit({ loaded: true, preferences, error: "" });
    } catch {
      emit({
        loaded: true,
        preferences: null,
        error: "Tercihler okunamadı. Yeniden kaydedebilirsin.",
      });
    }
  })());
}
export async function savePrivacyPreferences(preferences: PrivacyPreferences) {
  await AsyncStorage.setItem(privacyStorageKey, JSON.stringify(preferences));
  emit({ loaded: true, preferences, error: "" });
}
/** Withdrawal closes the in-memory gate even when the device cannot write. */
export function blockPrivacyLocally(preferences: PrivacyPreferences) {
  emit({ loaded: true, preferences, error: "" });
}
export function privacyStorageError(message: string) {
  emit({ ...state, error: message });
}
export function makePrivacyPreferences(
  value: Pick<PrivacyPreferences, "supabase" | "google" | "github">,
): PrivacyPreferences {
  return {
    ...value,
    privacyVersion,
    transferVersion,
    acknowledgedAt: new Date().toISOString(),
  };
}
export function allowsAccountEmail() {
  return state.preferences?.google === true;
}
