import {
  HomeWelcome,
  OwnSubmissionNotice,
  SpainFeature,
  CommunityNote,
  CommunityEmpty,
} from "./HomeSections";
import { CountryStory } from "./CountryStory";
import { FlatList, View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import {
  useCountries,
  useFeed,
  useFollows,
  type FeedFilter,
} from "../lib/data";
import { useAuth } from "../lib/auth";
import { rankFeed } from "../lib/ranking";
import { configured } from "../lib/supabase";
import { PostCard } from "./PostCard";
import {
  styles,
  Chip,
  Empty,
  ErrorState,
  Skeleton,
  Busy,
  Sheet,
  Button,
  colors,
} from "./ui";
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
  const [selected, setSelected] = useState("Tümü");
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(false);
  const [employment, setEmployment] = useState("");
  const [city, setCity] = useState("");
  const [result, setResult] = useState("");
  const [critical, setCritical] = useState(false);
  const [newest, setNewest] = useState(false);
  const { session } = useAuth();
  const count =
    Number(first) +
    Number(!!employment) +
    Number(!!city) +
    Number(!!result) +
    Number(critical);
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
      kind: critical
        ? "tip"
        : selected === "Deneyimler"
          ? "experience"
          : selected === "Sorular"
            ? "question"
            : baseFilter.kind,
      result: result || baseFilter.result,
    },
    !contentOnly,
  );
  const { data: countries } = useCountries();
  const { data: follows } = useFollows();
  const posts = useMemo(() => {
    const items = query.data?.pages.flat() ?? [];
    return newest ? items : rankFeed(items, follows ?? []);
  }, [query.data, newest, follows]);
  const primary = !country && !author && !saved;
  const top = (
    <View style={{ gap: 18, paddingBottom: 16 }}>
      {header}
      {primary && (
        <View style={{ gap: 18 }}>
          {!header && <HomeWelcome />}
          {!header && <OwnSubmissionNotice />}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.heading}>Rotanı keşfet</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              ÜLKE TOPLULUKLARI
            </Text>
          </View>
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
      {primary && !header && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.heading}>Topluluğun akışı</Text>
          <View
            style={{
              backgroundColor: "#E8EFEB",
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text
              style={{ fontSize: 10, fontWeight: "600", color: colors.blue }}
            >
              SANA ÖZEL
            </Text>
          </View>
        </View>
      )}
      {!author && !saved && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {!country && (
            <View
              accessibilityLabel="İçerik türü"
              style={{ flexDirection: "row", gap: 14, flex: 1 }}
            >
              {["Tümü", "Deneyimler", "Sorular"].map((label) => (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selected === label }}
                  aria-selected={selected === label}
                  onPress={() => {
                    setSelected(label);
                    setCritical(false);
                  }}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    borderBottomWidth: selected === label ? 2 : 0,
                    borderBottomColor: colors.blue,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selected === label ? "700" : "400",
                      color: selected === label ? colors.navy : colors.muted,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={count ? `Filtrele (${count})` : "Filtrele"}
            onPress={() => setOpen(true)}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Ionicons name="options-outline" size={19} color={colors.muted} />
            <Text style={styles.muted}>
              Filtrele{count ? ` · ${count}` : ""}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
  if (contentOnly)
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {header}
      </ScrollView>
    );
  return (
    <>
      <FlatList
        style={styles.page}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={top}
        ListEmptyComponent={
          !configured ? (
            <Empty
              title="Topluluğa şu an ulaşılamıyor"
              body="Biraz sonra yeniden deneyebilirsin."
            />
          ) : query.isPending ? (
            <Skeleton />
          ) : query.isError ? (
            <ErrorState retry={() => void query.refetch()} />
          ) : primary && !header && !count ? (
            <CommunityEmpty />
          ) : (
            <Empty
              title={
                author
                  ? baseFilter.pending
                    ? "İncelemede gönderin yok."
                    : "Henüz yayınlanmış paylaşım yok."
                  : saved
                    ? "Henüz bir şey kaydetmedin."
                    : count
                      ? "Bu filtrelerde henüz paylaşım yok."
                      : "Her rota bir deneyimle başlar."
              }
              body={
                count
                  ? "Filtrelerini genişleterek yeniden bakabilirsin."
                  : "Ülke topluluklarını keşfet; hazır olduğunda deneyiminle sen de yol göster."
              }
              action={
                saved
                  ? "Akışa dön"
                  : session
                    ? "Deneyimini paylaş"
                    : "Topluluğa katıl"
              }
              onPress={() =>
                router.push(
                  saved ? "/" : session ? "/create" : "/auth?mode=signup",
                )
              }
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
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <Busy />
          ) : primary && !header ? (
            <View style={{ gap: 14, paddingTop: 8 }}>
              <SpainFeature />
              <CommunityNote />
            </View>
          ) : undefined
        }
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Sana benzeyen başvuruları bul"
      >
        <Text style={styles.muted}>İhtiyacın olanları seçmen yeterli.</Text>
        <Text style={styles.heading}>Sıralama</Text>
        <View style={styles.row}>
          <Chip
            label="Sana özel"
            active={!newest}
            onPress={() => setNewest(false)}
          />
          <Chip
            label="En yeni"
            active={newest}
            onPress={() => setNewest(true)}
          />
        </View>
        <Text style={styles.heading}>Başvuru</Text>
        <View style={styles.row}>
          <Chip
            label="İlk Schengen"
            active={first}
            onPress={() => setFirst(!first)}
          />
          <Chip
            label="Kritik bilgiler"
            active={critical}
            onPress={() => setCritical(!critical)}
          />
        </View>
        <Text style={styles.heading}>Çalışma durumu</Text>
        <View style={styles.row}>
          {["Çalışan", "Öğrenci", "Serbest çalışan", "Emekli"].map((x) => (
            <Chip
              key={x}
              label={x}
              active={employment === x}
              onPress={() => setEmployment(employment === x ? "" : x)}
            />
          ))}
        </View>
        <Text style={styles.heading}>Başvuru şehri</Text>
        <View style={styles.row}>
          {["İstanbul", "Ankara", "İzmir"].map((x) => (
            <Chip
              key={x}
              label={x}
              active={city === x}
              onPress={() => setCity(city === x ? "" : x)}
            />
          ))}
        </View>
        <Text style={styles.heading}>Sonuç</Text>
        <View style={styles.row}>
          {[
            ["approved", "Onaylandı"],
            ["rejected", "Reddedildi"],
            ["waiting", "Bekliyor"],
          ].map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              active={result === value}
              onPress={() => setResult(result === value ? "" : value)}
            />
          ))}
        </View>
        <Button label="Sonuçları göster" onPress={() => setOpen(false)} />
        <Button
          secondary
          label="Filtreleri temizle"
          onPress={() => {
            setFirst(false);
            setEmployment("");
            setCity("");
            setResult("");
            setCritical(false);
            setNewest(false);
          }}
        />
      </Sheet>
    </>
  );
}
