import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Text, Pressable } from "react-native";
import { colors } from "../../src/components/ui";
import { useNotifications } from "../../src/lib/data";
export default function TabLayout() {
  const { data } = useNotifications();
  const unread = data?.filter((n) => !n.read_at).length;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 80, paddingTop: 8, paddingBottom: 16 },
        headerTitleStyle: { fontWeight: "800", color: colors.navy },
        headerRight: () => (
          <Pressable
            accessibilityLabel="Ara"
            onPress={() => router.push("/discover")}
            style={{ padding: 16 }}
          >
            <Ionicons name="search-outline" size={23} color={colors.navy} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Akış",
          headerTitle: "vize rotası  /  Schengen",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="home-outline"
              size={24}
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="compass-outline"
              size={24}
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compose"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/create");
          },
        }}
        options={{
          title: "Paylaş",
          tabBarIcon: () => (
            <Text
              style={{
                fontSize: 30,
                color: "#FFF",
                backgroundColor: colors.blue,
                borderRadius: 18,
                width: 44,
                textAlign: "center",
              }}
            >
              +
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Bildirimler",
          tabBarBadge: unread || undefined,
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="notifications-outline"
              size={24}
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="person-circle-outline"
              size={25}
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
