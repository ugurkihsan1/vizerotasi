import { SocialProfileSetup } from "../src/components/SocialProfileSetup";
import { NotificationSync } from "../src/components/NotificationSync";
import { PrivacyPreferences } from "../src/components/PrivacyPreferences";
import { PrivacySync } from "../src/components/PrivacySync";
import {
  loadPrivacyPreferences,
  privacyAllowsApp,
  usePrivacyPreferences,
} from "../src/lib/privacy";
import {
  initializeSupabase,
  stopSupabase,
  captureInitialAuthUrl,
} from "../src/lib/supabase";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import {
  useAppearance,
  themeColor,
  loadAppearance,
} from "../src/lib/appearance";

import { useEffect, useState } from "react";

import { ChatSync } from "../src/components/ChatEntry";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  Stack,
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
  usePathname,
} from "expo-router";
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
  const privacy = usePrivacyPreferences();
  const path = usePathname();
  useEffect(() => {
    void loadAppearance();
    void loadPrivacyPreferences();
    if (Platform.OS === "web") return;
    void Linking.getInitialURL().then((url) => {
      if (url) captureInitialAuthUrl(url);
    });
    const listener = Linking.addEventListener("url", ({ url }) =>
      captureInitialAuthUrl(url),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (privacy.loaded && !privacyAllowsApp(Platform.OS === "web"))
      stopSupabase();
  }, [privacy]);
  if (path.startsWith("/legal/"))
    return (
      <ThemeProvider value={appearance.dark ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
          <Stack
            screenOptions={{
              headerBackButtonDisplayMode: "minimal",
              headerTintColor: colors.navy,
              headerStyle: { backgroundColor: colors.bg },
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </SafeAreaProvider>
      </ThemeProvider>
    );
  // No first-launch legal pop-up: visitors can use the public app immediately.
  if (!privacy.loaded)
    return (
      <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
        <StatusBar style={appearance.dark ? "light" : "dark"} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </SafeAreaProvider>
    );
  // A user who explicitly refused or withdrew remains offline until changing
  // that decision. This is not displayed to first-time visitors.
  if (privacy.preferences && !privacyAllowsApp(Platform.OS === "web"))
    return (
      <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
        <StatusBar style={appearance.dark ? "light" : "dark"} />
        <ScrollView
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={{
            padding: 22,
            paddingTop: 56,
            paddingBottom: 40,
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
          }}
        >
          <PrivacyPreferences key={privacy.preferences.acknowledgedAt} />
        </ScrollView>
      </SafeAreaProvider>
    );
  return <ConnectedLayout />;
}
function ConnectedLayout() {
  useState(() => initializeSupabase());
  const appearance = useAppearance();

  useEffect(() => {
    return () => {
      void client.cancelQueries();
      client.clear();
    };
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
            <NotificationSync />
            <PrivacySync />
            <SocialProfileSetup />
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
                  headerBackButtonDisplayMode: "minimal",
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
                  options={{ title: "Topluluğa katıl", presentation: "card" }}
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
