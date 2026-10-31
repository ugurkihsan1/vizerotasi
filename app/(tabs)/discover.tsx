import { useAppearance, textSize, themeColor } from "../../src/lib/appearance";
import { SearchMatches } from "../../src/components/SearchMatches";
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/lib/auth";
import { useCountries, useFeed, useFollows } from "../../src/lib/data";
import { resolveSearch } from "../../src/lib/search";
import { useLocalSearchParams, router } from "expo-router";
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
import { Ionicons } from "@expo/vector-icons";
import type { Kind } from "../../src/lib/types";
const scopes = [
  "Tümü",
  "Deneyimler",
  "Önemli bilgiler",
  "Sorular",
  "Ülkeler",
  "Belgeler",
  "Kişiler",
] as const;
type Scope = (typeof scopes)[number];
export default function Discover() {
  useAppearance();

  const params = useLocalSearchParams<{ q?: string }>();
  return <DiscoverSearch key={params.q ?? ""} initialQuery={params.q ?? ""} />;
}
function DiscoverSearch({ initialQuery }: { initialQuery: string }) {
  useAppearance();

  const [text, setText] = useState(initialQuery),
    [search, setSearch] = useState(initialQuery.trim()),
    [searchFocused, setSearchFocused] = useState(false);
  const [scope, setScope] = useState<Scope>("Tümü"),
    [recent, setRecent] = useState<string[]>([]);
  const { session } = useAuth();
  const key = `recent-searches:${session?.user.id ?? "guest"}`;
  const countries = useCountries();
  const follows = useFollows();
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
      "Önemli bilgiler": "tip",
      Sorular: "question",
    } as Partial<Record<Scope, Kind>>
  )[scope];
  const feed = useFeed(
    {
      search: search ? plan.terms.join(" ") : undefined,
      countryIds: search ? plan.countryIds : undefined,
      kind: search ? kind : undefined,
    },
    !!search && !auxiliary && validSearch,
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
      <Field
        label="Arama"
        placeholder="Ülke, kişi veya paylaşım ara"
        value={text}
        maxLength={240}
        onChangeText={setText}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => {
          if (text.trim()) remember(text.trim());
          setTimeout(() => setSearchFocused(false), 150);
        }}
        onSubmitEditing={() => {
          remember(text.trim());
          setSearchFocused(false);
        }}
        returnKeyType="search"
      />
      {!!search && (
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
      {searchFocused && !search && recent.length > 0 && (
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
              <Text style={{ fontSize: textSize(12), color: colors.blue }}>
                Temizle
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: 4 }}>
            {recent.map((x) => (
              <Pressable
                key={x}
                accessibilityRole="button"
                accessibilityLabel={`${x} aramasını aç`}
                onPress={() => {
                  setText(x);
                  setScope("Tümü");
                  setSearchFocused(false);
                  remember(x);
                }}
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: textSize(20), color: colors.muted }}>
                  ↺
                </Text>
                <Text style={[styles.text, { flex: 1 }]}>{x}</Text>
                <Text style={styles.muted}>↗</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {!!search && plan.countryIds.length > 0 && (
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
            {search ? "Eşleşen ülkeler" : "Ülkeler"}
          </Text>
          {countries.isPending && <Busy />}
          {countries.isError && (
            <Button
              secondary
              label="Ülkeleri yeniden yükle"
              onPress={() => void countries.refetch()}
            />
          )}
          {!!search && !matched.length && !countries.isPending && (
            <Text style={styles.muted}>
              Ülke bulunamadı. Ülke adını veya kodunu deneyebilirsin.
            </Text>
          )}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {matched
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "tr"))
              .map((country) => (
                <Pressable
                  key={country.id}
                  accessibilityRole="link"
                  accessibilityLabel={`${country.name} topluluğu${follows.data?.includes(country.id) ? ", takip ediliyor" : ""}`}
                  onPress={() => router.push(`/country/${country.id}`)}
                  style={{
                    width: "48%",
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: themeColor("#E4E4E4", "border"),
                    borderRadius: 16,
                  }}
                >
                  <DestinationPhoto id={country.id} height={112} />
                  <View
                    style={{
                      minHeight: 48,
                      paddingHorizontal: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { flex: 1, fontSize: textSize(15) },
                      ]}
                      numberOfLines={1}
                    >
                      {country.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>
              ))}
          </View>
        </View>
      )}
      {!!search &&
        validSearch &&
        (scope === "Tümü" || scope === "Belgeler" || scope === "Kişiler") && (
          <SearchMatches
            search={scope === "Belgeler" ? plan.terms.join(" ") : search}
            countryIds={plan.countryIds}
            mode={scope === "Belgeler" ? "documents" : "people"}
          />
        )}
      {!!search && !validSearch && (
        <Text style={styles.muted}>
          Aramak için bir kelime veya ülke adı yaz.
        </Text>
      )}
      {!!search && !auxiliary && validSearch && (
        <>
          <Text style={styles.heading}>
            {scope === "Tümü" ? "Arama sonuçları" : `${scope} için sonuçlar`}
          </Text>
        </>
      )}
    </View>
  );
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={{ padding: 16, gap: 0, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      data={!search || auxiliary || !validSearch ? [] : posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <View style={{ marginHorizontal: -16 }}>
          <PostCard post={item} />
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        !search || auxiliary || !validSearch ? undefined : feed.isPending ? (
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
        !!search && !auxiliary && validSearch && feed.hasNextPage ? (
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
