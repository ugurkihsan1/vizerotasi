import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./ui";
export function Brand() {
  useAppearance();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: themeColor("#182E43", "surface"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="navigate"
          size={19}
          color={themeColor("#D8F0E9", "text")}
        />
      </View>
      <View>
        <Text
          style={{
            fontWeight: "800",
            fontSize: textSize(18),
            letterSpacing: -0.6,
            color: colors.navy,
          }}
        >
          vize rotası<Text style={{ color: colors.blue }}>・</Text>
        </Text>
      </View>
    </View>
  );
}
