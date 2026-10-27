import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { Text, View, Pressable } from "react-native";
import { useFocusEffect, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useCountries, useFollows, useDocuments } from "../lib/data";
import { getCountryGuide, mergeCountryDocuments } from "../lib/country-guides";
import { mergeSpainDocuments } from "../lib/spain";
import { CountryFlag } from "./CountryFlag";
import { styles, colors } from "./ui";
export function ApplicationOverview() {
  const { session } = useAuth();
  const countries = useCountries(),
    follows = useFollows();
  const plan = useQuery({
    queryKey: ["local-travel-plan"],
    queryFn: async () => {
      try {
        const value = JSON.parse(
          (await AsyncStorage.getItem("travel-plan:v1")) ?? "null",
        );
        return value &&
          ["booked", "appointment", "travel", "none"].includes(value.status) &&
          (value.country_id === null || typeof value.country_id === "string")
          ? (value as { status: string; country_id: string | null })
          : null;
      } catch {
        return null;
      }
    },
  });
  const refreshPlan = plan.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshPlan();
    }, [refreshPlan]),
  );
  const country = countries.data?.find(
    (c) => c.id === (plan.data?.country_id ?? follows.data?.[0]),
  );
  const documents = useDocuments(country?.id ?? "");
  const all =
    country?.id === "spain"
      ? mergeSpainDocuments(documents.data ?? [])
      : country && getCountryGuide(country.id)
        ? mergeCountryDocuments(country.id, documents.data ?? [])
        : [];
  const key =
    country?.id === "spain"
      ? `spain-tourism-checklist:v1:${session?.user.id ?? "guest"}`
      : `country-checklist:v1:${country?.id ?? ""}:${session?.user.id ?? "guest"}`;
  const checklist = useQuery({
    queryKey: ["home-checklist", key],
    enabled: !!country,
    queryFn: async () => {
      try {
        const values = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
        return Array.isArray(values)
          ? (values.filter((v) => typeof v === "string") as string[])
          : [];
      } catch {
        return [];
      }
    },
  });
  const refreshChecklist = checklist.refetch,
    hasCountry = !!country;
  useFocusEffect(
    useCallback(() => {
      if (hasCountry) void refreshChecklist();
    }, [hasCountry, refreshChecklist]),
  );
  const complete = all.filter((d) => checklist.data?.includes(d.id)).length;
  if (!country) return null;
  const openDocuments = () =>
    router.push({
      pathname: "/country/[id]",
      params: { id: country.id, tab: "Belgeler" },
    });
  const status =
    (
      {
        booked: "Randevu alındı",
        appointment: "Randevu hazırlığı",
        travel: "Seyahat planı",
      } as Record<string, string>
    )[plan.data?.status ?? ""] ?? "Başvuru hazırlığı";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Belgelerime devam et · ${country.name} · ${complete}/${all.length} belge hazır`}
      onPress={openDocuments}
      style={({ pressed }) => [
        styles.card,
        {
          padding: 16,
          gap: 12,
          backgroundColor: "#EDF3ED",
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: "#FFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CountryFlag
            code={country.code}
            emoji={country.flag}
            name={country.name}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.heading}>{country.name}</Text>
          <Text style={styles.muted}>{status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color={colors.blue} />
      </View>
      {!!all.length && (
        <>
          <View
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: "#D8E4DD",
              overflow: "hidden",
            }}
            accessibilityRole="progressbar"
            accessibilityLabel="Belge hazırlığı"
            aria-valuemin={0}
            aria-valuemax={all.length}
            aria-valuenow={complete}
            accessibilityValue={{ min: 0, max: all.length, now: complete }}
          >
            <View
              style={{
                height: 5,
                width: `${(complete / all.length) * 100}%`,
                backgroundColor: colors.blue,
                borderRadius: 3,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text style={styles.muted}>
              {complete}/{all.length} belge hazır
            </Text>
            <Text
              style={{ fontSize: 13, fontWeight: "700", color: colors.blue }}
            >
              Belgelerim
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
