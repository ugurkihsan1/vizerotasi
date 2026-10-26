import { SearchMatches } from "../../src/components/SearchMatches";
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/lib/auth";
import { useCountries, useFeed } from "../../src/lib/data";
import { resolveSearch } from "../../src/lib/search";
import { router, useLocalSearchParams } from "expo-router";
import { PostCard } from "../../src/components/PostCard";
import {
  Field,
  Chip,
  styles,
  colors,
  Button,
  Empty,
  Busy,
} from "../../src/components/ui";
import { DestinationPhoto } from "../../src/components/DestinationPhoto";
import { CountryFlag } from "../../src/components/CountryFlag";
import { SpainFeature } from "../../src/components/HomeSections";
import type { Kind } from "../../src/lib/types";
const scopes = [
  "Tümü",
  "Deneyimler",
  "Kritik noktalar",
  "Sorular",
  "Ülkeler",
  "Belgeler",
  "Kişiler",
] as const;
type Scope = (typeof scopes)[number];
export default function Discover() {
  const params = useLocalSearchParams<{ q?: string }>();
  return <DiscoverSearch key={params.q ?? ""} initialQuery={params.q ?? ""} />;
}
function DiscoverSearch({ initialQuery }: { initialQuery: string }) {
  const [text, setText] = useState(initialQuery),
    [search, setSearch] = useState(initialQuery.trim());
  const [scope, setScope] = useState<Scope>("Tümü"),
    [recent, setRecent] = useState<string[]>([]);
  const { session } = useAuth();
  const key = `recent-searches:${session?.user.id ?? "guest"}`;
  const countries = useCountries();
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key)
      .then((x) => {
        if (active) {
          const values = x ? JSON.parse(x) : [];
          setRecent(
            Array.isArray(values)
              ? values.filter((v) => typeof v === "string").slice(0, 6)
              : [],
          );
        }
      })
      .catch(() => {
        if (active) setRecent([]);
      });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);
  const plan = useMemo(
    () => resolveSearch(search, countries.data ?? []),
    [search, countries.data],
  );
  const validSearch =
    !search || plan.countryIds.length > 0 || plan.terms.length > 0;
  const auxiliary =
    !!search && ["Ülkeler", "Belgeler", "Kişiler"].includes(scope);
  const kind = (
    {
      Deneyimler: "experience",
      "Kritik noktalar": "tip",
      Sorular: "question",
    } as Partial<Record<Scope, Kind>>
  )[scope];
  const feed = useFeed(
    {
      search: search ? plan.terms.join(" ") : undefined,
      countryIds: search ? plan.countryIds : undefined,
      kind: search ? kind : undefined,
    },
    !auxiliary && validSearch,
  );
  const posts = feed.data?.pages.flat() ?? [];
  const remember = (value: string) => {
    const next = [value, ...recent.filter((x) => x !== value)]
      .filter(Boolean)
      .slice(0, 6);
    setRecent(next);
    void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  };
  const matched =
    countries.data?.filter((c) => !search || plan.countryIds.includes(c.id)) ??
    [];
  const showCountries =
    !search || scope === "Ülkeler" || (scope === "Tümü" && matched.length > 0);
  const header = (
    <View style={{ gap: 18, paddingBottom: 14 }}>
      <View style={{ gap: 5 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.4,
            color: colors.blue,
          }}
        >
          MERAK ETTİĞİN HER ŞEY
        </Text>
        <Text style={styles.title}>Senin rotan hangisi?</Text>
        <Text style={styles.muted}>
          Ülke, deneyim, kritik nokta ve soruları birlikte ara.
        </Text>
      </View>
      <Field
        label="Ülke, belge, deneyim veya soru ara"
        placeholder="Örn. sigorta, Almanya, Almanya sigorta…"
        value={text}
        maxLength={240}
        onChangeText={setText}
        onSubmitEditing={() => remember(text.trim())}
        returnKeyType="search"
      />
      {search && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {scopes.map((label) => (
            <Chip
              key={label}
              label={label}
              active={scope === label}
              onPress={() => setScope(label)}
            />
          ))}
        </ScrollView>
      )}
      {!search && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {["Sigorta", "İlk Schengen", "Banka hesabı", "Öğrenci", "Ret"].map(
            (x) => (
              <Chip
                key={x}
                label={x}
                onPress={() => {
                  setText(x);
                  setScope("Tümü");
                  remember(x);
                }}
              />
            ),
          )}
        </ScrollView>
      )}
      {!search && recent.length > 0 && (
        <View style={{ gap: 8 }}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={styles.muted}>Son aramalar</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Arama geçmişini temizle"
              onPress={() => {
                setRecent([]);
                void AsyncStorage.removeItem(key);
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 12, color: colors.blue }}>Temizle</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            {recent.map((x) => (
              <Chip
                key={x}
                label={x}
                onPress={() => {
                  setText(x);
                  setScope("Tümü");
                }}
              />
            ))}
          </View>
        </View>
      )}
      {search && plan.countryIds.length > 0 && (
        <Text style={styles.muted}>
          Ülke: {matched.map((c) => c.name).join(", ")}
          {plan.terms.length
            ? ` · Konu: ${plan.terms.join(" ")}`
            : " · Bu ülkedeki paylaşımlar"}
        </Text>
      )}
      {showCountries && (
        <View style={{ gap: 12 }}>
          <Text style={styles.heading}>
            {search ? "Eşleşen ülkeler" : "Bir ülkeyle başla"}
          </Text>
          {countries.isPending && <Busy />}
          {countries.isError && (
            <Button
              secondary
              label="Ülkeleri yeniden yükle"
              onPress={() => void countries.refetch()}
            />
          )}
          {search && !matched.length && !countries.isPending && (
            <Text style={styles.muted}>
              Ülke bulunamadı. Ülke adını veya kodunu deneyebilirsin.
            </Text>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {matched.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="link"
                accessibilityLabel={`${c.name} topluluğuna git`}
                onPress={() => router.push(`/country/${c.id}`)}
                style={{
                  width: "47.8%",
                  flexGrow: 1,
                  maxWidth: "50%",
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: "#FFF",
                  borderWidth: 1,
                  borderColor: "#E4E9E2",
                }}
              >
                {!search && <DestinationPhoto id={c.id} height={106} />}
                <View
                  style={{
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <CountryFlag code={c.code} emoji={c.flag} name={c.name} />
                  <Text style={[styles.pillText, { flex: 1 }]}>{c.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {!search && <SpainFeature />}
      {search &&
        validSearch &&
        (scope === "Belgeler" || scope === "Kişiler") && (
          <SearchMatches
            search={scope === "Kişiler" ? search : plan.terms.join(" ")}
            countryIds={plan.countryIds}
            mode={scope === "Belgeler" ? "documents" : "people"}
          />
        )}
      {search && !validSearch && (
        <Text style={styles.muted}>
          Aramak için bir kelime veya ülke adı yaz.
        </Text>
      )}
      {!auxiliary && validSearch && (
        <>
          <Text style={styles.heading}>
            {search
              ? scope === "Tümü"
                ? "Topluluktan sonuçlar"
                : `${scope} için sonuçlar`
              : "Son paylaşımlar"}
          </Text>
          {search && scope === "Tümü" && (
            <Text style={styles.muted}>
              Deneyimler, kritik noktalar ve sorular. Belge açıklamaları için
              Belgeler sekmesini seç.
            </Text>
          )}
        </>
      )}
    </View>
  );
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      data={auxiliary || !validSearch ? [] : posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        auxiliary || !validSearch ? undefined : feed.isPending ? (
          <Busy />
        ) : feed.isError ? (
          <Empty
            title="Paylaşımlar aranamadı"
            action="Yeniden dene"
            onPress={() => void feed.refetch()}
          />
        ) : (
          <Empty
            title={
              search ? "Bu aramada paylaşım bulunamadı" : "Henüz paylaşım yok"
            }
            body={
              search
                ? "Aramanı kısaltabilir veya Ülkeler ve Belgeler sekmelerine bakabilirsin."
                : "Bir ülke seçerek topluluğu keşfet."
            }
          />
        )
      }
      ListFooterComponent={
        !auxiliary && validSearch && feed.hasNextPage ? (
          <Button
            secondary
            label={
              feed.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla paylaşım"
            }
            disabled={feed.isFetchingNextPage}
            onPress={() => void feed.fetchNextPage()}
          />
        ) : undefined
      }
    />
  );
}
