import { Keyboard } from "react-native";
import { router } from "expo-router";

/** Pop every auth/callback screen instead of replacing only the top modal. */
export function finishAuth() {
  Keyboard.dismiss();
  router.dismissTo("/(tabs)");
}
