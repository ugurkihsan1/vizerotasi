import { View, Text, Pressable } from "react-native";
import { useCountries } from "../lib/data";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { photoAssets, photoCredits } from "../lib/destination-photos";
function flagSvg(code: string) {
  const rect = (x: number, y: number, w: number, h: number, color: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
  const horizontal = (colors: string[]) =>
    colors
      .map((c, i) =>
        rect(0, (i * 20) / colors.length, 30, 20 / colors.length, c),
      )
      .join("");
  const vertical = (colors: string[]) =>
    colors.map((c, i) => rect(i * 10, 0, 10, 20, c)).join("");
  let body = "";
  switch (code) {
    case "NO":
      body =
        rect(0, 0, 30, 20, "#BA0C2F") +
        rect(7, 0, 6, 20, "#FFFFFF") +
        rect(0, 7, 30, 6, "#FFFFFF") +
        rect(9, 0, 2, 20, "#00205B") +
        rect(0, 9, 30, 2, "#00205B");
      break;
    case "DE":
      body = horizontal(["#111111", "#DD2028", "#F4C844"]);
      break;
    case "EE":
      body = horizontal(["#4891D9", "#151515", "#FFFFFF"]);
      break;
    case "PL":
      body = horizontal(["#FFFFFF", "#DC143C"]);
      break;
    case "FR":
      body = vertical(["#173A8A", "#FFFFFF", "#ED2939"]);
      break;
    case "IT":
      body = vertical(["#169B62", "#FFFFFF", "#E53945"]);
      break;
    case "NL":
      body = horizontal(["#AE1C28", "#FFFFFF", "#21468B"]);
      break;
    case "HU":
      body = horizontal(["#CE2939", "#FFFFFF", "#477050"]);
      break;
    case "ES":
      body = rect(0, 0, 30, 20, "#AA151B") + rect(0, 5, 30, 10, "#F1BF00");
      break;
    case "GR":
      body =
        horizontal(
          Array.from({ length: 9 }, (_, i) => (i % 2 ? "#FFFFFF" : "#1767B0")),
        ) +
        rect(0, 0, 12, 11.12, "#1767B0") +
        rect(4.5, 0, 2.5, 11.12, "#FFFFFF") +
        rect(0, 4.4, 12, 2.3, "#FFFFFF");
      break;
    default:
      return null;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 30 20">${body}</svg>`;
}
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
