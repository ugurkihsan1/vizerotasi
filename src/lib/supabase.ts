import publicConfig from "../config/supabase.public.json";
import { resolvePublicConfig } from "./public-config";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { privacyAllowsApp } from "./privacy";
import { parseAuthCallback } from "./auth-callback";
// Only the publishable client key is bundled. RLS protects the public API.
const config = resolvePublicConfig(
  {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  publicConfig,
);
export const configured = !!config;
// Capture the auth redirect before the SDK consumes and clears its URL fragment.
export let initialAuthUrl =
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.href
    : null;
export function clearInitialAuthUrl() {
  initialAuthUrl = null;
}
export function captureInitialAuthUrl(url: string) {
  if (parseAuthCallback(url)) initialAuthUrl = url;
}
export let supabase: SupabaseClient | null = null;
let transportAllowed = false;
const pendingRequests = new Set<AbortController>();
const storageKey = config
  ? `sb-${new URL(config.url).hostname.split(".")[0]}-auth-token`
  : "";
export function initializeSupabase() {
  if (supabase || !config) return supabase;
  if (!privacyAllowsApp(Platform.OS === "web")) return null;
  transportAllowed = true;
  supabase = createClient(config.url, config.key, {
    global: {
      fetch: async (input, init) => {
        if (!transportAllowed || !privacyAllowsApp(Platform.OS === "web"))
          throw new Error("Aktarım tercihini kontrol et.");
        const controller = new AbortController();
        const signal =
          init?.signal ?? (input instanceof Request ? input.signal : null);
        const abort = () => controller.abort();
        if (signal?.aborted) controller.abort();
        else signal?.addEventListener("abort", abort, { once: true });
        pendingRequests.add(controller);
        try {
          return await fetch(input, { ...init, signal: controller.signal });
        } finally {
          signal?.removeEventListener("abort", abort);
          pendingRequests.delete(controller);
        }
      },
    },
    auth: {
      storage: AsyncStorage,
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      lock: processLock,
    },
  });
  return supabase;
}
/** Stop transport first. Do not use auth.signOut here: it sends another request. */
export function stopSupabase() {
  transportAllowed = false;
  for (const request of pendingRequests) request.abort();
  pendingRequests.clear();
  const connection = supabase;
  supabase = null;
  if (connection) {
    void connection.auth.stopAutoRefresh();
    connection.realtime.disconnect();
  }
}
export async function clearPrivateDeviceData() {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter(
      (key) =>
        (storageKey && key.startsWith(storageKey)) ||
        key.startsWith("pending-signup-avatar:") ||
        key.startsWith("recent-searches:") ||
        key === "vizerotasi-public-cache",
    ),
  );
}
/** The one terminal request is solely the user's explicit withdrawal instruction. */
export async function sendWithdrawalReceipt(
  token: string,
  preference_payload: object,
) {
  if (!config) throw new Error("Tercih kaydı gönderilemedi.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(
      `${config.url}/rest/v1/rpc/record_legal_preferences`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preference_payload }),
        signal: controller.signal,
      },
    );
    if (!response.ok)
      throw new Error("Sunucudaki tercih kaydı güncellenemedi.");
  } finally {
    clearTimeout(timer);
  }
}
if (Platform.OS !== "web")
  AppState.addEventListener("change", (state) => {
    if (state === "active" && transportAllowed)
      supabase?.auth.startAutoRefresh();
    else supabase?.auth.stopAutoRefresh();
  });
export function db() {
  if (!supabase) throw new Error("Supabase bağlantısı henüz kurulmadı.");
  return supabase;
}
