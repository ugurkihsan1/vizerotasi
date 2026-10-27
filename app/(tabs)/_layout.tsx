import { MessagesEntry } from "../../src/components/ChatEntry";
import { Brand } from "../../src/components/Brand";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
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
        headerRight: () => <MessagesEntry />,
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
          tabBarButton: ({
            onPress,
            onLongPress,
            accessibilityLabel,
            accessibilityState,
            testID,
          }) => (
            <Pressable
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel ?? "Paylaş"}
              accessibilityState={accessibilityState}
              testID={testID}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 13,
                  backgroundColor: colors.blue,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: colors.blue,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.18,
                  shadowRadius: 5,
                  elevation: 2,
                }}
              >
                <Ionicons name="add" size={25} color="#FFFFFF" />
              </View>
              <Text
                style={{ fontSize: 10, fontWeight: "600", color: colors.blue }}
              >
                Paylaş
              </Text>
            </Pressable>
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
