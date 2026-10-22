import { CountryStory } from "./CountryStory";
import { FlatList, View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import {
  useCountries,
  useFeed,
  useFollows,
  type FeedFilter,
} from "../lib/data";
import { rankFeed } from "../lib/ranking";
import { configured } from "../lib/supabase";
import { PostCard } from "./PostCard";
import { styles, Chip, Empty, ErrorState, Skeleton, Busy } from "./ui";
export const filters = [
  "Sana Özel",
  "Yeni",
  "Deneyimler",
  "Sorular",
  "Kritik",
  "Onaylananlar",
  "Retler",
];
export function Feed({
  country,
  author,
  saved = false,
  header,
  search,
  baseFilter = {},
  contentOnly = false,
}: {
  country?: string;
  author?: string;
  saved?: boolean;
  header?: ReactElement;
  search?: string;
  baseFilter?: FeedFilter;
  contentOnly?: boolean;
}) {
  const [selected, setSelected] = useState("Sana Özel");
  const [first, setFirst] = useState(false);
  const [employment, setEmployment] = useState("");
  const [city, setCity] = useState("");
  const query = useFeed(
    {
      ...baseFilter,
      country,
      author,
      saved,
      search,
      first,
      employment: employment || undefined,
      city: city || undefined,
      kind:
        selected === "Deneyimler"
          ? "experience"
          : selected === "Sorular"
            ? "question"
            : selected === "Kritik"
              ? "tip"
              : baseFilter.kind,
      result:
        selected === "Onaylananlar"
          ? "approved"
          : selected === "Retler"
            ? "rejected"
            : undefined,
    },
    !contentOnly,
  );
  const { data: countries } = useCountries();
  const { data: follows } = useFollows();
  const posts = useMemo(() => {
    const items = query.data?.pages.flat() ?? [];
    return selected === "Sana Özel" ? rankFeed(items, follows ?? []) : items;
  }, [query.data, selected, follows]);
  const top = (
    <View style={{ gap: 16, paddingBottom: 16 }}>
      {header}
      {!country && !author && !saved && (
        <View>
          <Text style={[styles.heading, { marginBottom: 12 }]}>Ülkeler</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {countries
              ?.slice()
              .sort(
                (a, b) =>
                  Number(follows?.includes(b.id)) -
                  Number(follows?.includes(a.id)),
              )
              .map((c) => (
                <CountryStory
                  key={c.id}
                  country={c}
                  followed={follows?.includes(c.id)}
                />
              ))}
          </ScrollView>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {filters.map((f) => (
          <Chip
            key={f}
            label={f}
            active={selected === f}
            onPress={() => setSelected(f)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Chip
          label="İlk Schengen"
          active={first}
          onPress={() => setFirst(!first)}
        />
        {["Çalışan", "Öğrenci", "Serbest çalışan"].map((x) => (
          <Chip
            key={x}
            label={x}
            active={employment === x}
            onPress={() => setEmployment(employment === x ? "" : x)}
          />
        ))}
        {["İstanbul", "Ankara", "İzmir"].map((x) => (
          <Chip
            key={x}
            label={x}
            active={city === x}
            onPress={() => setCity(city === x ? "" : x)}
          />
        ))}
      </ScrollView>
    </View>
  );
  if (contentOnly)
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {header}
      </ScrollView>
    );
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      data={posts}
      keyExtractor={(x) => x.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={top}
      ListEmptyComponent={
        !configured ? (
          <Empty
            title="Topluluk için ilk adım"
            body="Supabase bağlantısı henüz kurulmadı. Bağlantı tamamlandığında gerçek paylaşımlar burada görünecek."
          />
        ) : query.isPending ? (
          <Skeleton />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : (
          <Empty
            title={
              saved
                ? "Henüz bir şey kaydetmedin."
                : "Burada ilk paylaşım senin olabilir 👀"
            }
            body="Deneyimini paylaş, topluluğa yol göster."
            action="Paylaşım oluştur"
            onPress={() => router.push("/create")}
          />
        )
      }
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage)
          void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={query.isFetchingNextPage ? <Busy /> : undefined}
    />
  );
}
