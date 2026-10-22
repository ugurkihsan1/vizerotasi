import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:8081",
    viewport: { width: 390, height: 844 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 npx expo start --port 8081 --max-workers 2",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
