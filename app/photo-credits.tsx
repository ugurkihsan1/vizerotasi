import { useState } from "react";
import { ScrollView, View, Text, Linking } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { photoAssets, photoCredits } from "../src/lib/destination-photos";
import { styles, Button, Message } from "../src/components/ui";
export default function PhotoCredits() {
  const { country } = useLocalSearchParams<{ country?: string }>();
  const [error, setError] = useState("");
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
      <Text style={styles.title}>Rotaların gerçek yüzü.</Text>
      <Text style={styles.muted}>
        Ülke kartlarında gerçek yerlerin fotoğraflarını kullanıyoruz. Fotoğrafçı
        ve lisans bilgilerini burada bulabilirsin.
      </Text>
      <Message text={error} />
      {entries.map((p) => (
        <View style={styles.card} key={p.id}>
          <Image
            source={photoAssets[p.id]}
            style={{ width: "100%", height: 190, borderRadius: 14 }}
            contentFit="contain"
            accessibilityLabel={p.landmark}
          />
          <Text style={styles.heading}>
            {p.country} · {p.landmark}
          </Text>
          <Text style={styles.text}>Fotoğraf: {p.author}</Text>
          <Text style={styles.muted}>{p.license} · Wikimedia Commons</Text>
          <Text style={styles.muted}>
            Kartlara sığdırmak için fotoğrafın bir bölümü gösterilebilir. Özgün
            fotoğrafın içeriği değiştirilmedi.
          </Text>
          <Button
            secondary
            label="Fotoğrafın kaynak sayfası"
            onPress={() => open(p.sourceUrl)}
          />
          <Button
            secondary
            label="Fotoğraf lisansı"
            onPress={() => open(p.licenseUrl)}
          />
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
