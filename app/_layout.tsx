import { StatusBar } from "expo-status-bar";
import {
  useAppearance,
  themeColor,
  loadAppearance,
} from "../src/lib/appearance";

import { useEffect } from "react";

import { ChatSync } from "../src/components/ChatEntry";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/lib/auth";
import { colors } from "../src/components/ui";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, gcTime: 86400000 } },
});
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "vizerotasi-public-cache",
});
export default function Layout() {
  const appearance = useAppearance();

  useEffect(() => {
    void loadAppearance();
  }, []);
  const baseTheme = appearance.dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.bg,
      card: themeColor("#FFF", "surface"),
      text: colors.navy,
      border: themeColor("#E6EAE5", "border"),
      primary: colors.blue,
    },
  };
  return (
    <ThemeProvider value={navigationTheme}>
      <SafeAreaProvider
        style={{ backgroundColor: themeColor("#E9EDE8", "surface") }}
      >
        <PersistQueryClientProvider
          client={client}
          persistOptions={{
            persister,
            maxAge: 86400000,
            buster: "v2-private-profiles",
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => {
                return (
                  query.state.status === "success" &&
                  query.queryKey[0] === "countries"
                );
              },
            },
          }}
        >
          <AuthProvider>
            <StatusBar style={appearance.dark ? "light" : "dark"} />
            <ChatSync />
            <View
              testID="app-surface"
              style={{
                flex: 1,
                width: "100%",
                maxWidth: 760,
                alignSelf: "center",
                backgroundColor: colors.bg,
              }}
            >
              <Stack
                screenOptions={{
                  headerTintColor: colors.navy,
                  headerStyle: {
                    backgroundColor: themeColor("#FFF", "surface"),
                  },
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="groups" options={{ title: "Gruplar" }} />
                <Stack.Screen name="group/[id]" options={{ title: "Grup" }} />
                <Stack.Screen name="messages" options={{ title: "Mesajlar" }} />
                <Stack.Screen name="chat/[id]" options={{ title: "Sohbet" }} />
                <Stack.Screen
                  name="photo-credits"
                  options={{ title: "Fotoğraf kaynakları" }}
                />
                <Stack.Screen
                  name="badges"
                  options={{ title: "Rozetler ve seviyeler" }}
                />
                <Stack.Screen
                  name="document-notes"
                  options={{ title: "Belge uyarılarını yönet" }}
                />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="auth"
                  options={{ title: "Topluluğa katıl", presentation: "modal" }}
                />
                <Stack.Screen
                  name="create"
                  options={{
                    title: "Paylaş",
                    presentation: "modal",
                  }}
                />
                <Stack.Screen
                  name="country/[id]"
                  options={{ title: "Ülke topluluğu" }}
                />
                <Stack.Screen
                  name="experience/[id]"
                  options={{ title: "Deneyim" }}
                />
                <Stack.Screen
                  name="question/[id]"
                  options={{ title: "Soru" }}
                />
                <Stack.Screen
                  name="tip/[id]"
                  options={{ title: "Önemli bilgi" }}
                />
                <Stack.Screen
                  name="profile/[username]"
                  options={{ title: "Topluluk profili" }}
                />
                <Stack.Screen
                  name="moderation"
                  options={{ title: "Moderasyon" }}
                />
                <Stack.Screen
                  name="admin-countries"
                  options={{ title: "Ülkeleri yönet" }}
                />
                <Stack.Screen name="admin" options={{ title: "Yönetim" }} />
                <Stack.Screen name="settings" options={{ title: "Ayarlar" }} />
              </Stack>
            </View>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
