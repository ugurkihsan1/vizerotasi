import { getCountryGuide } from "../lib/country-guides";
import { useState } from "react";
import { Pressable, Text, View, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { CommunityTips } from "./CommunityTips";
import { styles, colors, Button, Message } from "./ui";
import { useAppearance } from "../lib/appearance";
export function VisaFeeSection({ country }: { country: string }) {
  useAppearance();
  const hasSchengenSource = country === "spain" || !!getCountryGuide(country);
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  return (
    <View style={[styles.card, { padding: 14, borderRadius: 16, gap: 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Vize ücreti"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
        }}
      >
        <Ionicons name="wallet-outline" size={21} color={colors.amber} />
        <Text style={[styles.pillText, { flex: 1 }]}>Vize ücreti</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.muted}
        />
      </Pressable>
      <CommunityTips
        country={country}
        categories={["visa-fee"]}
        topicLabel="Vize ücreti"
      />
      {open && (
        <>
          <Text style={styles.text}>
            Vize harcı, başvuru merkezi hizmet bedeli ve ödeme yöntemi için
            güncel resmî koşulları kontrol et.
          </Text>
          {hasSchengenSource && (
            <Button
              secondary
              label="Resmî ücret bilgisi"
              onPress={() =>
                void Linking.openURL(
                  "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en",
                ).catch(() => setError("Kaynak açılamadı."))
              }
            />
          )}
          <Button
            secondary
            label="Vize ücreti hakkında önemli bilgi paylaş"
            onPress={() =>
              router.push({
                pathname: "/create",
                params: { kind: "tip", country, category: "visa-fee" },
              })
            }
          />
          <Message text={error} />
        </>
      )}
    </View>
  );
}
