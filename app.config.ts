import googleSignIn from "./src/config/google-signin.public.json";
import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? googleSignIn.iosClientId;
  const plugins = (config.plugins ?? []).filter(
    (plugin) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) !==
      "@react-native-google-signin/google-signin",
  );
  if (iosClientId) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: iosClientId.split(".").reverse().join("."),
      },
    ]);
    plugins.push("./plugins/with-google-signin-nonce.cjs");
  }
  return {
    ...config,
    plugins,
    name: config.name ?? "Vizesel",
    slug: config.slug ?? "vizerotasi",
    experiments: {
      ...config.experiments,
      baseUrl: process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? "",
    },
  };
};
