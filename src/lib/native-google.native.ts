import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import config from "../config/google-signin.public.json";

/** Google owns the native sign-in UI; Supabase receives only the resulting ID token. */
export async function nativeGoogleCredential(): Promise<{
  token: string;
  nonce?: string;
} | null> {
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
    const options: NonNullable<Parameters<typeof GoogleSignin.signIn>[0]> & {
      nonce?: string;
    } = {};
    let nonce: string | undefined;
    if (Platform.OS === "ios") {
      nonce = Crypto.randomUUID();
      options.nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce,
      );
    }
    const response = await GoogleSignin.signIn(options);
    if (response.type === "cancelled") return null;
    if (!response.data.idToken) throw { code: "social_auth_failed" };
    return { token: response.data.idToken, ...(nonce ? { nonce } : {}) };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED)
      return null;
    throw error;
  }
}
