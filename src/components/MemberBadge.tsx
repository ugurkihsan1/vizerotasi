import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { levelDefinitions } from "../lib/community";
import { colors } from "./ui";
export function MemberBadge({
  label,
  pioneer = false,
}: {
  label: string;
  pioneer?: boolean;
}) {
  const level = levelDefinitions.find((l) => l.name === label);
  const color = level?.color ?? colors.blue;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: `${color}12`,
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 6,
      }}
    >
      <Ionicons
        name={
          (level?.icon ??
            (pioneer
              ? "flag-outline"
              : "person-outline")) as keyof typeof Ionicons.glyphMap
        }
        size={13}
        color={color}
      />
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}
