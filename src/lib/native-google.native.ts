import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import config from "../config/google-signin.public.json";

/** Google owns the native sign-in UI; Supabase receives only the resulting ID token. */
export async function nativeGoogleIdToken(): Promise<string | null> {
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? config.iosClientId;
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? config.webClientId;
  if (!webClientId || (Platform.OS === "ios" && !iosClientId))
    throw { code: "google_native_not_configured" };
  GoogleSignin.configure({
    ...(iosClientId ? { iosClientId } : {}),
    webClientId,
    offlineAccess: false,
  });
  try {
    if (Platform.OS === "android")
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    const response = await GoogleSignin.signIn();
    if (response.type === "cancelled") return null;
    if (!response.data.idToken) throw { code: "social_auth_failed" };
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED)
      return null;
    throw error;
  }
}
