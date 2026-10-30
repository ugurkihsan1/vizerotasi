// Metro resolves native-google.native.ts on iOS and Android.
export async function nativeGoogleCredential(): Promise<{
  token: string;
  nonce?: string;
} | null> {
  throw { code: "google_native_not_configured" };
}
