import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { styles } from "./ui";
export function GroupsEntry() {
  useAppearance();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Paylaşım gruplarını aç"
      onPress={() => router.push("/groups")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: themeColor("#EDE8F8", "surface"),
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: themeColor("#FFF", "surface"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="people-outline"
          size={22}
          color={themeColor("#71579D", "text")}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pillText}>Gruplar</Text>
        <Text style={[styles.muted, { fontSize: textSize(12) }]}>
          Erasmus ve diğer gruplar
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={19}
        color={themeColor("#71579D", "text")}
      />
    </Pressable>
  );
}
