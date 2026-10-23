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
import { styles, colors, Button } from "./ui";
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
  const followed =
    countries.data?.filter((c) => follows.data?.includes(c.id)) ?? [];
  if (!country && !followed.length) return null;
  return (
    <View
      style={[
        styles.card,
        { padding: 16, gap: 12, backgroundColor: "#EDF3ED" },
      ]}
    >
      <Text style={styles.heading}>Senin başvuru rotan</Text>
      {country && (
        <>
          <View style={styles.row}>
            <CountryFlag
              code={country.code}
              emoji={country.flag}
              name={country.name}
            />
            <Text style={styles.pillText}>{country.name}</Text>
            <Text style={styles.muted}>
              {(
                {
                  booked: "Randevu alındı",
                  appointment: "Randevu hazırlığı",
                  travel: "Seyahat planı",
                } as Record<string, string>
              )[plan.data?.status ?? ""] ?? "Takip ettiğin ülke"}
            </Text>
          </View>
          {!!all.length && (
            <Text style={styles.text}>
              {complete} / {all.length} belge hazır işaretlendi ·{" "}
              {all.length - complete} belge kontrol bekliyor
            </Text>
          )}
          <Button
            label="Belgelerime devam et"
            onPress={() =>
              router.push({
                pathname: "/country/[id]",
                params: { id: country.id, tab: "Belgeler" },
              })
            }
          />
        </>
      )}
      {!!followed.length && (
        <View style={styles.row}>
          <Text style={styles.muted}>Takip ettiğin ülkeler:</Text>
          {followed.slice(0, 4).map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="link"
              accessibilityLabel={`${c.name} topluluğunu aç`}
              onPress={() => router.push(`/country/${c.id}`)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: colors.blue, fontSize: 12 }}>{c.name}</Text>
            </Pressable>
          ))}
          {followed.length > 4 && (
            <Text style={styles.muted}>+{followed.length - 4}</Text>
          )}
        </View>
      )}
    </View>
  );
}
