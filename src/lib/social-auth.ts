import { nativeGoogleCredential } from "./native-google";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { db, supabaseProjectUrl } from "./supabase";
import { webPath } from "./web-path";
import { parseAuthCallback } from "./auth-callback";
import { isTrustedAuthReturnUrl, isTrustedOAuthUrl } from "./auth-urls";

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = "apple" | "google";

export async function signInSocial(
  provider: SocialProvider,
  onAppleCode?: (code: string) => void,
) {
  const client = db();
  if (provider === "google" && Platform.OS === "ios") {
    const credential = await nativeGoogleCredential();
    if (!credential) return "cancelled" as const;
    const result = await client.auth.signInWithIdToken({
      provider: "google",
      ...credential,
    });
    if (result.error) throw result.error;
    return "signed-in" as const;
  }
  if (
    provider === "apple" &&
    Platform.OS === "ios" &&
    (await AppleAuthentication.isAvailableAsync())
  ) {
    const nonce = Crypto.randomUUID();
    const state = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce,
    );
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
        state,
      });
      if (credential.state !== state || !credential.identityToken)
        throw { code: "social_auth_failed" };
      const result = await client.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce,
      });
      if (result.error) throw result.error;
      if (credential.authorizationCode)
        onAppleCode?.(credential.authorizationCode);
      // Apple returns the name only on the first authorization.
      if (credential.fullName) {
        const name = AppleAuthentication.formatFullName(
          credential.fullName,
        ).trim();
        if (name) await client.auth.updateUser({ data: { full_name: name } });
      }
      return "signed-in" as const;
    } catch (error) {
      if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED")
        return "cancelled" as const;
      throw error;
    }
  }

  const redirectTo =
    Platform.OS === "web"
      ? `${window.location.origin}${webPath("/auth")}?oauth=1`
      : Linking.createURL("/auth", { queryParams: { oauth: "1" } });
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === "google"
        ? { queryParams: { prompt: "select_account" } }
        : {}),
    },
  });
  if (error) throw error;
  if (
    !data.url ||
    !supabaseProjectUrl ||
    !isTrustedOAuthUrl(data.url, supabaseProjectUrl, provider, redirectTo)
  )
    throw { code: "unsafe_auth_redirect" };
  if (Platform.OS === "web") {
    window.location.assign(data.url);
    return "redirecting" as const;
  }
  const response = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (response.type !== "success") return "cancelled" as const;
  if (!isTrustedAuthReturnUrl(response.url, redirectTo))
    throw { code: "unsafe_auth_redirect" };
  const callback = parseAuthCallback(response.url);
  if (callback?.error) throw { code: callback.error };
  if (!callback?.accessToken || !callback.refreshToken)
    throw { code: "social_auth_failed" };
  const result = await client.auth.setSession({
    access_token: callback.accessToken,
    refresh_token: callback.refreshToken,
  });
  if (result.error) throw result.error;
  return "signed-in" as const;
}
