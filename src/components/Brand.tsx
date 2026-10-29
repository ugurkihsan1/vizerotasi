import { Image, Text, View } from "react-native";
import { isDark, useAppearance, textSize } from "../lib/appearance";

export function Brand({ cover = false }: { cover?: boolean }) {
  useAppearance();
  const dark = isDark();
  return (
    <View
      accessibilityLabel="Vizesel"
      accessible
      style={{
        flexDirection: cover ? "column" : "row",
        alignItems: "center",
        alignSelf: cover ? "center" : "flex-start",
        gap: cover ? 14 : 7,
      }}
    >
      <Image
        source={dark
          ? require("../../assets/brand/vizesel-mark-dark.png")
          : require("../../assets/brand/vizesel-mark-light.png")}
        accessible={false}
        style={{ width: cover ? 96 : 30, height: cover ? 96 : 30, resizeMode: "contain" }}
      />
      <Text
        style={{
          fontSize: textSize(cover ? 28 : 23),
          lineHeight: textSize(cover ? 34 : 30),
          fontWeight: "800",
          letterSpacing: -0.8,
          color: dark ? "#FFFFFF" : "#10243F",
        }}
      >
        Vizesel
      </Text>
    </View>
  );
}
