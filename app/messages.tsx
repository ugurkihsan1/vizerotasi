import { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../src/lib/auth";
import { db } from "../src/lib/supabase";
import { chatError, useChatInbox } from "../src/lib/chat";
import { useCountries, useFollows } from "../src/lib/data";
import { formatDateTime } from "../src/lib/dates";
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
  const { session } = useAuth();
  return <MessagesScreen key={session?.user.id ?? "guest"} />;
}
function MessagesScreen() {
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
  const [compose, setCompose] = useState(false),
    [people, setPeople] = useState<Profile[]>([]),
    [title, setTitle] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showBlocks, setShowBlocks] = useState(false);
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
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 6 }}>
        <Text style={styles.title}>Sohbetlerin burada.</Text>
        <Text style={styles.muted}>
          Topluluğunla konuş, yol arkadaşlarınla bağlantıda kal.
        </Text>
      </View>
      <Button
        label="Yeni sohbet / Grup kur"
        onPress={() => {
          setError("");
          setCompose(true);
        }}
      />
      <Text style={styles.heading}>Takip ettiğin topluluklar</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {" "}
        {countries.data
          ?.filter((c) => follows.data?.includes(c.id))
          .map((c) => (
            <View
              key={c.id}
              style={[styles.card, { width: 180, padding: 12, gap: 8 }]}
            >
              <View style={styles.row}>
                <CountryFlag code={c.code} emoji={c.flag} name={c.name} />
                <Text style={styles.pillText}>{c.name}</Text>
              </View>
              <CommunityChatEntry
                countryId={c.id}
                name={c.name}
                label={`${c.name} sohbeti`}
              />
            </View>
          ))}
      </ScrollView>
      {!follows.isPending && !follows.data?.length && (
        <Empty
          title="Bir ülkeyi takip ederek başla"
          action="Ülkeleri keşfet"
          onPress={() => router.push("/discover")}
        />
      )}
      <Text style={styles.heading}>Mesajlar ve istekler</Text>
      {inbox.isPending && <Busy />}
      {inbox.isError && (
        <Empty
          title={chatError(inbox.error)}
          action="Yeniden dene"
          onPress={() => void inbox.refetch()}
        />
      )}
      {inbox.data?.pages.flat().map((room) => (
        <Pressable
          key={room.id}
          accessibilityRole="link"
          accessibilityLabel={`${room.title}${room.status === "invited" ? " · Sohbet isteği" : ""}`}
          onPress={() => router.push(`/chat/${room.id}`)}
          style={[styles.card, { padding: 16, gap: 7 }]}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={[styles.pillText, { flex: 1 }]} numberOfLines={1}>
              {room.title}
            </Text>
            {room.unread_count > 0 && (
              <View
                style={{
                  borderRadius: 10,
                  backgroundColor: colors.blue,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 11 }}>
                  {room.unread_count}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.muted} numberOfLines={1}>
            {room.status === "invited"
              ? "Sohbet isteği · Kabul etmeden geçmiş görünmez"
              : room.closed_at
                ? "Grup kapatıldı"
                : room.last_body === null
                  ? "Henüz mesaj yok"
                  : room.last_body === ""
                    ? "Mesaj kaldırıldı"
                    : room.last_body}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted }}>
            {room.kind === "community"
              ? "Topluluk"
              : room.kind === "group"
                ? "Grup"
                : "Özel sohbet"}{" "}
            · {formatDateTime(room.last_at)}
          </Text>
        </Pressable>
      ))}
      {inbox.isSuccess && !inbox.data.pages.flat().length && (
        <Text style={styles.muted}>
          Henüz sohbetin yok. Bir kişiyi seçerek başlayabilirsin.
        </Text>
      )}
      {inbox.hasNextPage && (
        <Button
          secondary
          label="Daha fazla sohbet"
          disabled={inbox.isFetchingNextPage}
          onPress={() => void inbox.fetchNextPage()}
        />
      )}
      <Button
        secondary
        label="Engellenen kişiler"
        onPress={() => setShowBlocks(true)}
      />
      <Sheet
        title="Yeni sohbet"
        visible={compose}
        onClose={() => setCompose(false)}
      >
        <Text style={styles.muted}>
          Bir kişiyle özel sohbet, birden fazla kişiyle en fazla 10 kişilik grup
          kur. Seçtiğin kişilere davet gider.
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
        {blocks.isError && <Message text={chatError(blocks.error)} />}{" "}
        {blocks.data?.map((p) => (
          <View key={p.blocked_id} style={{ gap: 8 }}>
            <Text style={styles.text}>@{p.profiles?.username ?? "Üye"}</Text>
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
                    void cache.invalidateQueries({ queryKey: ["chat"] });
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
  );
}
