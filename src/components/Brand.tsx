import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./ui";
export function Brand() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: colors.navy,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="navigate" size={19} color="#D8F0E9" />
      </View>
      <View>
        <Text
          style={{
            fontWeight: "800",
            fontSize: 18,
            letterSpacing: -0.6,
            color: colors.navy,
          }}
        >
          vize rotası<Text style={{ color: colors.blue }}>・</Text>
        </Text>
        <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.2 }}>
          SCHENGEN TOPLULUĞU
        </Text>
      </View>
    </View>
  );
}
