import { Image, View } from "react-native";

export function Brand() {
  return (
    <View style={{ justifyContent: "center" }}>
      <Image
        source={require("../../assets/brand/vizesel-logo-hd.png")}
        accessibilityLabel="Vizesel"
        style={{ width: 112, height: 66, resizeMode: "contain" }}
      />
    </View>
  );
}
