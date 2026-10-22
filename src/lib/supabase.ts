import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
export const supabase = configured
  ? createClient(url!, key!, {
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
