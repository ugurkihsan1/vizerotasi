import { Image, Text, View } from "react-native";
import { isDark, useAppearance, textSize } from "../lib/appearance";

export function Brand({ cover = false }: { cover?: boolean }) {
  useAppearance();
  if (cover) return (
    <View style={{ alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 22, padding: 12 }}>
      <Image source={require("../../assets/brand/vizesel-logo-hd.png")} accessibilityLabel="Vizesel" style={{ width: 156, height: 106, resizeMode: "contain" }} />
    </View>
  );
  return <Text accessibilityLabel="Vizesel" style={{ fontSize: textSize(25), fontWeight: "800", letterSpacing: -1, color: isDark() ? "#FFFFFF" : "#10243F" }}>Vizesel</Text>;
}
