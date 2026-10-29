import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { isDark, useAppearance } from "../lib/appearance";

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
  accent?: string;
}) {
  useAppearance();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = url?.trim();
  const dark = isDark();
  if (source && failedUrl !== source) {
    return (
      <Image
        source={source}
        contentFit="cover"
        style={{ width: size, height: size, borderRadius: size / 2 }}
        cachePolicy="memory-disk"
        accessibilityLabel={name}
        onError={() => setFailedUrl(source)}
      />
    );
  }
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name} için varsayılan profil fotoğrafı`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dark ? "#262626" : "#EFEFEF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Ionicons
        name="person"
        size={Math.round(size * 0.68)}
        color={dark ? "#929292" : "#A8A8A8"}
        accessible={false}
      />
    </View>
  );
}
