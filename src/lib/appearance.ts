import { useSyncExternalStore } from "react";
import { Appearance, Platform, AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
export const darkPalette = {
  background: "#080808",
  surface: "#151515",
  raised: "#262626",
  border: "#343434",
  heading: "#F2F2F2",
  text: "#E4E4E4",
  muted: "#A0A0A0",
  accent: "#D4D4D4",
};
export type ThemeMode = "light" | "dark" | "system";
export interface AppPreferences {
  theme: ThemeMode;
  reducedMotion: boolean;
  haptics: boolean;
  largeText: boolean;
}
let preferences: AppPreferences = {
  theme: "system",
  reducedMotion: false,
  haptics: true,
  largeText: false,
};
let systemDark = Appearance.getColorScheme() === "dark";
let systemReduce = false,
  version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.style.colorScheme = isDark() ? "dark" : "light";
    document.documentElement.style.backgroundColor = isDark()
      ? darkPalette.background
      : "#F5F5F0";
  }
  listeners.forEach((f) => f());
};
export const isDark = () =>
  preferences.theme === "dark" ||
  (preferences.theme === "system" && systemDark);
export const motionReduced = () => preferences.reducedMotion || systemReduce;
export function useAppearance() {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => version,
    () => 0,
  );
  return { ...preferences, dark: isDark(), motionReduced: motionReduced() };
}
export async function setPreferences(next: Partial<AppPreferences>) {
  preferences = { ...preferences, ...next };
  emit();
  await AsyncStorage.setItem("app-appearance:v1", JSON.stringify(preferences));
}
export async function loadAppearance() {
  try {
    const p = JSON.parse(
      (await AsyncStorage.getItem("app-appearance:v1")) ?? "null",
    );
    if (p && ["light", "dark", "system"].includes(p.theme))
      preferences = {
        theme: p.theme,
        reducedMotion: !!p.reducedMotion,
        haptics: p.haptics !== false,
        largeText: !!p.largeText,
      };
  } catch {}
  emit();
}
Appearance.addChangeListener(({ colorScheme }) => {
  systemDark = colorScheme === "dark";
  emit();
});
void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
  systemReduce = v;
  emit();
});
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
  systemReduce = v;
  emit();
});
export function textSize(size: number) {
  return preferences.largeText ? Math.round(size * 1.15) : size;
}
/** Neutral dark surfaces; explicit status tints keep meaningful outcomes distinct. */
export function themeColor(
  hex: string,
  role: "surface" | "text" | "border" | "status" = "surface",
) {
  if (!isDark()) return hex;
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4)
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  if (!/^[0-9a-f]{6,8}$/i.test(h)) return hex;
  const alpha = h.slice(6),
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)),
    max = Math.max(...rgb),
    min = Math.min(...rgb),
    lum = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 255;
  if (role === "border") return darkPalette.border + alpha;
  if (role === "text") {
    if (min > 230) return "#FFFFFF" + alpha;
    if (max - min < 45)
      return (lum < 0.25 ? darkPalette.heading : darkPalette.muted) + alpha;
    if (hex.slice(1, 7).toLowerCase() === "24766c")
      return darkPalette.accent + alpha;
    if (lum < 0.25) return darkPalette.heading + alpha;
    if (lum < 0.65)
      return (
        "#" +
        rgb
          .map((v) =>
            Math.round(v * 0.5 + 120)
              .toString(16)
              .padStart(2, "0"),
          )
          .join("") +
        alpha
      );
    return hex;
  }
  // Color is reserved for outcomes and source notes, not every panel.
  if (role === "status") {
    const avg = rgb.reduce((a, b) => a + b) / 3;
    return (
      "#" +
      rgb
        .map((v) =>
          Math.max(8, Math.min(60, Math.round(24 + (v - avg) * 0.45)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("") +
      alpha
    );
  }
  if (alpha) return "#000000" + alpha;
  return lum > 0.7 ? darkPalette.surface : darkPalette.raised;
}
