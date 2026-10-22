import { Brand } from "../../src/components/Brand";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Text } from "react-native";
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
        tabBarStyle: {
          height: 82,
          paddingTop: 10,
          paddingBottom: 16,
          borderTopWidth: 1,
          borderTopColor: "#E6EAE5",
          backgroundColor: "#FCFDF9",
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        headerStyle: { backgroundColor: "#FCFDF9" },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "800", color: colors.navy },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Akış",
          headerTitle: () => <Brand />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={25}
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
