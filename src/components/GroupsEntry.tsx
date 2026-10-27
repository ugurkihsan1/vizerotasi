import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { styles } from "./ui";
export function GroupsEntry() {
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
        backgroundColor: "#EDE8F8",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: "#FFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="people-outline" size={22} color="#71579D" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pillText}>Gruplar</Text>
        <Text style={[styles.muted, { fontSize: 12 }]}>
          Erasmus ve ortak yolculuklar
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#71579D" />
    </Pressable>
  );
}
