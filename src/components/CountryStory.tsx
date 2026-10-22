import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { Country } from "../lib/types";
import { colors } from "./ui";
export function CountryStory({
  country,
  followed,
}: {
  country: Country;
  followed?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${country.name} topluluğu${followed ? ", takip ediliyor" : ""}`}
      onPress={() => router.push(`/country/${country.id}`)}
      style={{ alignItems: "center", gap: 8, width: 72 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 25,
          backgroundColor: "#FFF",
          padding: 4,
          borderWidth: 2,
          borderColor: followed ? colors.blue : "#DDE7F5",
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 20,
            backgroundColor: "#EAF1FC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 30 }}>{country.flag}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.navy }}>
        {country.name}
      </Text>
    </Pressable>
  );
}
