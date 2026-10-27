import { useAppearance, textSize } from "../src/lib/appearance";
import { useState } from "react";
import { ScrollView, View, Text, Linking } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { photoAssets, photoCredits } from "../src/lib/destination-photos";
import { styles, Button, Message } from "../src/components/ui";
export default function PhotoCredits() {
  useAppearance();

  const { country } = useLocalSearchParams<{ country?: string }>(),
    [error, setError] = useState("");
  const entries = country
    ? photoCredits.filter((p) => p.id === country)
    : photoCredits;
  function open(url: string) {
    void Linking.openURL(url).catch(() =>
      setError("Kaynak bağlantısı açılamadı."),
    );
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Message text={error} />
      {entries.map((p) => (
        <View key={p.id} style={[styles.card, { padding: 14, gap: 10 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image
              source={photoAssets[p.id]}
              contentFit="cover"
              style={{ width: 64, height: 64, borderRadius: 14 }}
              accessibilityLabel={p.landmark}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.pillText}>{p.landmark}</Text>
              <Text style={[styles.muted, { fontSize: textSize(12) }]}>
                Fotoğraf: {p.author}
              </Text>
              <Text style={[styles.muted, { fontSize: textSize(11) }]}>
                {p.license} · Wikimedia Commons
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                label="Kaynak"
                onPress={() => open(p.sourceUrl)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                label="Fotoğraf lisansı"
                onPress={() => open(p.licenseUrl)}
              />
            </View>
          </View>
        </View>
      ))}
      {country && (
        <Button
          secondary
          label="Tüm fotoğraf kaynaklarını gör"
          onPress={() => router.replace("/photo-credits")}
        />
      )}
    </ScrollView>
  );
}
