import { View, Text, Pressable } from "react-native";
import { useCountries } from "../lib/data";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { flagSvg } from "../lib/flags";
import { photoAssets, photoCredits } from "../lib/destination-photos";
export function DestinationPhoto({
  id,
  height = 100,
}: {
  id: string;
  height?: number;
}) {
  const { data: countries } = useCountries();
  const country = countries?.find((c) => c.id === id);
  const flag = country ? flagSvg(country.code) : null;
  const photo = photoCredits.find((p) => p.id === id);
  return (
    <View
      style={{
        width: "100%",
        height,
        overflow: "hidden",
        backgroundColor: "#E4E9E5",
      }}
    >
      {photo && (
        <Image
          source={photoAssets[id]}
          contentFit="cover"
          contentPosition={{
            left: "50%",
            top: id === "france" ? (height >= 120 ? "0%" : "35%") : "25%",
          }}
          style={{ width: "100%", height }}
          accessibilityLabel={photo.landmark}
          transition={150}
        />
      )}
      {photo && height >= 120 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf bilgisi ve kaynak"
          onPress={(e) => {
            e.stopPropagation();
            router.push({
              pathname: "/photo-credits",
              params: { country: id },
            });
          }}
          hitSlop={6}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            minWidth: 32,
            minHeight: 32,
            borderRadius: 16,
            backgroundColor: "#172F50B8",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      )}
      {country && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 9,
            top: 9,
            padding: 4,
            borderRadius: 8,
            backgroundColor: "#FFFFFFF0",
            borderWidth: 1,
            borderColor: "#FFFFFF",
            shadowColor: "#172F50",
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          {flag ? (
            <Image
              source={{
                uri: `data:image/svg+xml;utf8,${encodeURIComponent(flag)}`,
              }}
              style={{ width: 27, height: 18, borderRadius: 2 }}
              contentFit="contain"
              accessible={false}
            />
          ) : (
            <Text style={{ fontSize: 17 }}>{country.flag}</Text>
          )}
        </View>
      )}
    </View>
  );
}
