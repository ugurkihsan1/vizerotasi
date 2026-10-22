import { Platform, Text } from "react-native";
import { Image } from "expo-image";
import { flagSvg } from "../lib/flags";
export function CountryFlag({
  code,
  emoji,
  name,
}: {
  code: string;
  emoji: string;
  name: string;
}) {
  const svg = flagSvg(code);
  return Platform.OS === "web" && svg ? (
    <Image
      source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
      style={{ width: 22, height: 15, borderRadius: 2 }}
      accessibilityLabel={`${name} bayrağı ${emoji}`}
      contentFit="contain"
    />
  ) : (
    <Text accessibilityLabel={`${name} bayrağı`} style={{ fontSize: 19 }}>
      {emoji}
    </Text>
  );
}
