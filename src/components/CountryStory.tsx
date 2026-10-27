import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { Country } from "../lib/types";
import { colors } from "./ui";
import { DestinationPhoto } from "./DestinationPhoto";
export function CountryStory({
  country,
  followed,
}: {
  country: Country;
  followed?: boolean;
}) {
  useAppearance();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${country.name} topluluğu${followed ? ", takip ediliyor" : ""}`}
      onPress={() => router.push(`/country/${country.id}`)}
      style={{ width: 80, gap: 6 }}
    >
      <View
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: themeColor("#EAF0ED", "surface"),
          borderWidth: followed ? 2 : 0,
          borderColor: colors.blue,
        }}
      >
        <DestinationPhoto id={country.id} height={76} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: textSize(12),
            fontWeight: "600",
            color: colors.navy,
          }}
        >
          {country.name}
        </Text>
        {followed && (
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: themeColor("#24766C", "surface"),
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
