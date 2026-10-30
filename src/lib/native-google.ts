// Metro resolves native-google.native.ts on iOS and Android.
export async function nativeGoogleIdToken(): Promise<string | null> {
  throw { code: "google_native_not_configured" };
}
