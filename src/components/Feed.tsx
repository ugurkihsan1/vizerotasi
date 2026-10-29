import { useAppearance, textSize } from "../lib/appearance";
import { ApplicationOverview } from "./ApplicationOverview";
import {
  OwnSubmissionNotice,
  CommunityEmpty,
} from "./HomeSections";
import { FlatList, View, Text, Pressable, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState, useEffect, type ReactElement } from "react";
import { useFeed, useFollows, PAGE_SIZE, type FeedFilter } from "../lib/data";
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
  homeTabs,
  onScroll,
  homeKind,
  country,
  author,
  saved = false,
  header,
  search,
  baseFilter = {},
  contentOnly = false,
}: {
  homeTabs?: ReactElement;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  homeKind?: "experience" | "question";
  country?: string;
  author?: string;
  saved?: boolean;
  header?: ReactElement;
  search?: string;
  baseFilter?: FeedFilter;
  contentOnly?: boolean;
}) {
  useAppearance();

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
      prioritizeFollowed: !country && !author && !saved && !search,
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
            : (homeKind ?? baseFilter.kind),
      result: result || baseFilter.result,
    },
    !contentOnly,
  );
  const { data: follows } = useFollows();
  const posts = useMemo(() => {
    const items = query.data?.pages.flat() ?? [];
    return newest ? items : rankFeed(items, follows ?? []);
  }, [query.data, newest, follows]);
  const { isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    query;
  useEffect(() => {
    if (
      !isPending &&
      !isError &&
      !posts.length &&
      hasNextPage &&
      !isFetchingNextPage
    )
      void fetchNextPage();
  }, [
    posts.length,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);
  const primary = !country && !author && !saved;
  const top = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      {header}
      {primary && (
        <View style={{ gap: 18 }}>
          {!header && <ApplicationOverview />}
          {!header && <OwnSubmissionNotice />}
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
          {homeTabs && <View style={{ flex: 1 }}>{homeTabs}</View>}
          {!country && !homeTabs && (
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
                      fontSize: textSize(14),
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
            {!homeTabs && (
              <Text style={styles.muted}>
                Filtrele{count ? ` · ${count}` : ""}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
  return (
    <>
      <FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={9}
        style={styles.page}
        contentContainerStyle={{ padding: 16, paddingTop: onScroll ? 72 : 16, paddingBottom: 32, gap: 12 }}
        data={contentOnly ? [] : posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={top}
        ListEmptyComponent={
          contentOnly ? undefined : !configured ? (
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
                      : "Henüz paylaşım yok."
              }
              body={
                count
                  ? "Filtrelerini genişleterek yeniden bakabilirsin."
                  : undefined
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
          if (!contentOnly && query.hasNextPage && !query.isFetchingNextPage)
            void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={query.isFetchingNextPage ? <Busy /> : undefined}
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Paylaşımları filtrele"
      >
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
            label="Önemli bilgiler"
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
