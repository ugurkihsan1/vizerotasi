import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { Country } from "../lib/types";
import { colors } from "./ui";
import { DestinationArt } from "./DestinationArt";
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
      style={{ width: 104, gap: 8 }}
    >
      <View
        style={{
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: "#EAF0ED",
          borderWidth: followed ? 2 : 0,
          borderColor: colors.blue,
        }}
      >
        <DestinationArt id={country.id} height={74} />
        <View
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            width: 24,
            height: 24,
            borderRadius: 9,
            backgroundColor: "#FFFFFFD9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16 }}>{country.flag}</Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.navy }}>
          {country.name}
        </Text>
        {followed && (
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.blue,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
