import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Vize Rotası",
  slug: config.slug ?? "vizerotasi",
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? "",
  },
});
