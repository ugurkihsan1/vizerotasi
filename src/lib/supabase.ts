import publicConfig from "../config/supabase.public.json";
import { resolvePublicConfig } from "./public-config";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
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
export const supabase = config
  ? createClient(config.url, config.key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
        lock: processLock,
      },
    })
  : null;
if (Platform.OS !== "web")
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase?.auth.startAutoRefresh();
    else supabase?.auth.stopAutoRefresh();
  });
export function db() {
  if (!supabase) throw new Error("Supabase bağlantısı henüz kurulmadı.");
  return supabase;
}
