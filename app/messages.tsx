import { useAppearance, themeColor, textSize } from "../src/lib/appearance";
import { Ionicons } from "@expo/vector-icons";
import { InboxRow, type InboxPerson } from "../src/components/InboxRow";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  RefreshControl,
} from "react-native";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../src/lib/auth";
import { db } from "../src/lib/supabase";
import { chatError, useChatInbox } from "../src/lib/chat";
import { useCountries, useFollows } from "../src/lib/data";
import type { Profile } from "../src/lib/types";
import { ChatPeoplePicker } from "../src/components/ChatComposer";
import { CommunityChatEntry } from "../src/components/ChatEntry";
import { CountryFlag } from "../src/components/CountryFlag";
import {
  Button,
  Field,
  Sheet,
  Empty,
  Busy,
  Message,
  styles,
  colors,
} from "../src/components/ui";
export default function Messages() {
  useAppearance();

  const { session } = useAuth();
  const params = useLocalSearchParams<{ blocks?: string }>();
  return (
    <MessagesScreen
      key={`${session?.user.id ?? "guest"}:${params.blocks ?? ""}`}
      initialBlocks={params.blocks === "1"}
    />
  );
}
function MessagesScreen({
  initialBlocks = false,
}: {
  initialBlocks?: boolean;
}) {
  useAppearance();

  const { session, loading } = useAuth(),
    cache = useQueryClient();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const inbox = useChatInbox(focused),
    countries = useCountries(),
    follows = useFollows();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tümü"),
    [refreshing, setRefreshing] = useState(false);
  const seen = new Set<string>();
  const rooms = (inbox.data?.pages.flat() ?? []).filter((room) => {
    if (seen.has(room.id)) return false;
    seen.add(room.id);
    return true;
  });
  const privateRooms = rooms.filter((room) => room.kind !== "community");
  const communityRooms = rooms.filter((room) => room.kind === "community");
  const ids = privateRooms
    .filter((room) => room.status === "active" && room.kind !== "community")
    .map((room) => room.id);
  const peers = useQuery({
    queryKey: ["chat", "inbox-people", session?.user.id, ids],
    enabled: !!session && focused && ids.length > 0,
    queryFn: async () => {
      const result: Record<string, InboxPerson[]> = {};
      // Batch visible memberships; never read private message history for avatars.
      for (let offset = 0; offset < ids.length; offset += 30) {
        const r = await db()
          .from("chat_members")
          .select(
            "room_id,user_id,profiles!chat_members_user_id_fkey(display_name,username,avatar_url)",
          )
          .in("room_id", ids.slice(offset, offset + 30))
          .neq("user_id", session!.user.id)
          .in("status", ["active", "invited"])
          .order("user_id")
          .limit(270);
        if (r.error) throw r.error;
        for (const row of r.data ?? []) {
          const profile = (
            Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          ) as Omit<InboxPerson, "id"> | null;
          if (profile && row.room_id)
            (result[row.room_id] ??= []).push({ id: row.user_id, ...profile });
        }
      }
      return result;
    },
    refetchInterval: 60000,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = inbox;
  useEffect(() => {
    if (
      focused &&
      hasNextPage &&
      !isFetchingNextPage &&
      (search.trim() || privateRooms.length === 0)
    )
      void fetchNextPage();
  }, [
    focused,
    search,
    privateRooms.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);
  const term = search.trim().toLocaleLowerCase("tr-TR");
  const filtered = privateRooms.filter(
    (room) =>
      (filter !== "Okunmamış" ||
        (room.status === "active" &&
          !room.closed_at &&
          room.unread_count > 0)) &&
      (filter !== "İstekler" || room.status === "invited") &&
      [
        room.title,
        ...(peers.data?.[room.id] ?? []).flatMap((p) => [
          p.display_name,
          p.username,
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(term),
  );
  const followedCountries =
    countries.data?.filter(
      (c) =>
        (follows.data?.includes(c.id) ||
          communityRooms.some((room) => room.country_id === c.id)) &&
        c.name.toLocaleLowerCase("tr-TR").includes(term),
    ) ?? [];
  const [compose, setCompose] = useState(false),
    [people, setPeople] = useState<Profile[]>([]),
    [title, setTitle] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showBlocks, setShowBlocks] = useState(initialBlocks);
  const blocks = useQuery({
    queryKey: ["chat", "blocks", session?.user.id],
    enabled: !!session && showBlocks,
    queryFn: async () => {
      const r = await db()
        .from("chat_blocks")
        .select(
          "blocked_id,profiles!chat_blocks_blocked_id_fkey(username,display_name)",
        )
        .eq("blocker_id", session!.user.id);
      if (r.error) throw r.error;
      return r.data as unknown as {
        blocked_id: string;
        profiles: { username: string; display_name: string };
      }[];
    },
  });
  if (loading) return <Busy />;
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Sohbet için topluluğa katıl"
          body="Takip ettiğin ülkelerin odalarında ve seçtiğin üyelerle mesajlaşabilirsin."
          action="Giriş yap / Üye ol"
          onPress={() => router.push("/auth")}
        />
      </View>
    );
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await db().rpc("chat_create_private", {
        recipients: people.map((p) => p.id),
        room_title: title.trim(),
      });
      if (r.error) throw r.error;
      setCompose(false);
      setPeople([]);
      setTitle("");
      void cache.invalidateQueries({ queryKey: ["chat"] });
      router.push(`/chat/${r.data}`);
    } catch (e) {
      setError(chatError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "Mesajlar" }} />
      <SafeAreaView
        style={styles.page}
        edges={["top", "left", "right", "bottom"]}
      >
        <ScrollView
          style={styles.page}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 24,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.muted}
              onRefresh={() => {
                setRefreshing(true);
                void inbox.refetch().finally(() => setRefreshing(false));
              }}
            />
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              style={{ width: 40, height: 44, justifyContent: "center" }}
            >
              <Ionicons name="arrow-back" size={23} color={colors.navy} />
            </Pressable>
            <Text
              style={[
                styles.heading,
                { flex: 1, fontSize: textSize(25), letterSpacing: -0.6 },
              ]}
            >
              Mesajlar
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Engellenen kişiler"
              onPress={() => setShowBlocks(true)}
              style={{
                width: 40,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="options-outline" size={22} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yeni sohbet / Grup kur"
              onPress={() => {
                setError("");
                setCompose(true);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                backgroundColor: colors.navy,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="create-outline" size={23} color={colors.bg} />
            </Pressable>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              paddingLeft: 13,
              paddingRight: 4,
              minHeight: 46,
              borderRadius: 14,
              backgroundColor: themeColor("#F0F0F0", "surface"),
            }}
          >
            <Ionicons name="search-outline" size={19} color={colors.muted} />
            <TextInput
              accessibilityLabel="Sohbet ara"
              placeholder="Ara"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: textSize(15),
                minHeight: 44,
              }}
            />
            {!!search && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aramayı temizle"
                onPress={() => setSearch("")}
                style={{
                  width: 42,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
          {followedCountries.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingVertical: 4 }}
            >
              {followedCountries.map((c) => {
                const unread = communityRooms
                  .filter((room) => room.country_id === c.id && !room.closed_at)
                  .reduce((sum, room) => sum + room.unread_count, 0);
                return (
                  <CommunityChatEntry
                    key={c.id}
                    countryId={c.id}
                    name={c.name}
                    label={`${c.name} sohbeti`}
                  >
                    <View
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        borderWidth: unread ? 2 : 1,
                        borderColor: unread
                          ? colors.navy
                          : themeColor("#E4E4E4", "border"),
                        backgroundColor: themeColor("#F5F5F5", "surface"),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CountryFlag code={c.code} emoji={c.flag} name={c.name} />
                      {unread > 0 && (
                        <View
                          accessibilityLabel={`${c.name}: ${unread} okunmamış mesaj`}
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            minWidth: 20,
                            height: 20,
                            borderRadius: 10,
                            paddingHorizontal: 5,
                            backgroundColor: colors.navy,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: colors.bg,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.bg,
                              fontSize: textSize(10),
                              fontWeight: "700",
                            }}
                          >
                            {unread > 99 ? "99+" : unread}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.muted,
                        fontSize: textSize(11),
                        maxWidth: 76,
                      }}
                    >
                      {c.name}
                    </Text>
                  </CommunityChatEntry>
                );
              })}
            </ScrollView>
          )}
          <View
            style={{
              flexDirection: "row",
              gap: 24,
              borderBottomWidth: 1,
              borderBottomColor: themeColor("#E4E4E4", "border"),
            }}
          >
            {["Tümü", "Okunmamış", "İstekler"].map((label) => {
              const count =
                label === "İstekler"
                  ? privateRooms.filter((r) => r.status === "invited").length
                  : label === "Okunmamış"
                    ? privateRooms.filter(
                        (r) =>
                          r.status === "active" &&
                          !r.closed_at &&
                          r.unread_count > 0,
                      ).length
                    : 0;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: label === filter }}
                  aria-selected={label === filter}
                  onPress={() => setFilter(label)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    minHeight: 44,
                    borderBottomWidth: filter === label ? 2 : 0,
                    borderBottomColor: colors.navy,
                  }}
                >
                  <Text
                    style={{
                      color: filter === label ? colors.navy : colors.muted,
                      fontSize: textSize(13),
                      fontWeight: filter === label ? "700" : "500",
                    }}
                  >
                    {label}
                  </Text>
                  {count > 0 && (
                    <Text
                      style={{
                        fontSize: textSize(11),
                        fontWeight: "600",
                        color: colors.muted,
                      }}
                    >
                      {count}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          {inbox.isPending && <Busy />}
          {inbox.isError && (
            <Empty
              title={chatError(inbox.error)}
              action="Yeniden dene"
              onPress={() => void inbox.refetch()}
            />
          )}
          <View>
            {filtered.map((room) => (
              <InboxRow
                key={room.id}
                room={room}
                people={peers.data?.[room.id]}
                country={countries.data?.find((c) => c.id === room.country_id)}
              />
            ))}
          </View>
          {inbox.isSuccess &&
            !filtered.length &&
            !inbox.isFetching &&
            !inbox.hasNextPage && (
              <View
                style={{ alignItems: "center", gap: 12, paddingVertical: 36 }}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 24,
                    backgroundColor: themeColor("#F3F3F3", "surface"),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={29}
                    color={colors.muted}
                  />
                </View>
                <Text style={styles.heading}>
                  {term
                    ? "Sohbet bulunamadı"
                    : filter === "İstekler"
                      ? "Yeni istek yok"
                      : filter === "Okunmamış"
                        ? "Hepsini okudun"
                        : "İlk sohbetini başlat"}
                </Text>
                {!term && filter === "Tümü" && (
                  <Button
                    secondary
                    label="Yeni mesaj"
                    onPress={() => setCompose(true)}
                  />
                )}
              </View>
            )}
          {inbox.hasNextPage && (
            <Button
              secondary
              label="Daha fazla sohbet"
              disabled={inbox.isFetchingNextPage}
              onPress={() => void inbox.fetchNextPage()}
            />
          )}
          <Sheet
            title="Yeni sohbet"
            visible={compose}
            onClose={() => setCompose(false)}
          >
            <Text style={styles.muted}>
              Seçtiğin kişilere sohbet isteği gider.
            </Text>
            <ChatPeoplePicker
              selected={people}
              onChange={setPeople}
              disabled={busy}
            />
            {people.length > 1 && (
              <Field
                label="Grup adı"
                placeholder="Örn. İspanya yol arkadaşları"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
            )}
            <Message text={error} />
            <Button
              label={people.length > 1 ? "Grup daveti gönder" : "Sohbeti aç"}
              disabled={
                busy ||
                !people.length ||
                (people.length > 1 && title.trim().length < 2)
              }
              onPress={() => void create()}
            />
          </Sheet>
          <Sheet
            title="Engellenen kişiler"
            visible={showBlocks}
            onClose={() => setShowBlocks(false)}
          >
            <Text style={styles.muted}>
              Engellenen kişiler birebir mesaj veya yeni davet gönderemez. Ortak
              grup ve topluluk mesajları görünmeye devam edebilir.
            </Text>
            {blocks.isError && <Message text={chatError(blocks.error)} />}
            {blocks.data?.map((p) => (
              <View key={p.blocked_id} style={{ gap: 8 }}>
                <Text style={styles.text}>
                  @{p.profiles?.username ?? "Üye"}
                </Text>
                <Button
                  secondary
                  label={`@${p.profiles?.username ?? "Üye"} engelini kaldır`}
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    void Promise.resolve(
                      db().rpc("chat_block_user", {
                        target_user: p.blocked_id,
                        block_user: false,
                      }),
                    )
                      .then((r) => {
                        if (r.error) throw r.error;
                        for (const key of ["chat", "social", "feed", "post"])
                          void cache.invalidateQueries({ queryKey: [key] });
                      })
                      .catch((e) => setError(chatError(e)))
                      .finally(() => setBusy(false));
                  }}
                />
              </View>
            ))}
            {blocks.isSuccess && !blocks.data.length && (
              <Text style={styles.muted}>Engellediğin kişi yok.</Text>
            )}
            <Message text={error} />
          </Sheet>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
