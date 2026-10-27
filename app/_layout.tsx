import { ChatSync } from "../src/components/ChatEntry";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { Stack } from "expo-router";
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
  return (
    <SafeAreaProvider style={{ backgroundColor: "#E9EDE8" }}>
      <PersistQueryClientProvider
        client={client}
        persistOptions={{
          persister,
          maxAge: 86400000,
          buster: "v1",
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const [name, filter] = query.queryKey;
              return (
                query.state.status === "success" &&
                (name === "countries" ||
                  (name === "feed" &&
                    !(filter as { author?: string; saved?: boolean })?.author &&
                    !(filter as { saved?: boolean })?.saved))
              );
            },
          },
        }}
      >
        <AuthProvider>
          <ChatSync />
          <View
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
                headerStyle: { backgroundColor: "#FFF" },
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
                  title: "Ne paylaşmak istiyorsun?",
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
              <Stack.Screen name="question/[id]" options={{ title: "Soru" }} />
              <Stack.Screen
                name="tip/[id]"
                options={{ title: "Kritik nokta" }}
              />
              <Stack.Screen
                name="profile/[username]"
                options={{ title: "Topluluk profili" }}
              />
              <Stack.Screen
                name="moderation"
                options={{ title: "Moderasyon" }}
              />
              <Stack.Screen name="admin" options={{ title: "Yönetim" }} />
              <Stack.Screen name="settings" options={{ title: "Ayarlar" }} />
            </Stack>
          </View>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
