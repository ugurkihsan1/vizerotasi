import { ChatPhoto, ChatSharedPost } from "../../src/components/ChatAttachment";
import {
  pickChatPhoto,
  sendChatPhoto,
  discardChatPhoto,
  type ChatPhotoDraft,
} from "../../src/lib/chat-photo";
import { Image } from "expo-image";
import { useAppearance, themeColor, textSize } from "../../src/lib/appearance";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth";
import { db } from "../../src/lib/supabase";
import { useProfile } from "../../src/lib/data";
import {
  chatError,
  useChatMessages,
  useChatMembers,
  useChatRoom,
  type ChatMessage,
} from "../../src/lib/chat";
import { formatDate, formatDateTime } from "../../src/lib/dates";
import type { Profile } from "../../src/lib/types";
import { Avatar } from "../../src/components/PostCard";
import { ChatPeoplePicker } from "../../src/components/ChatComposer";
import {
  Button,
  Field,
  Sheet,
  Busy,
  Empty,
  Message,
  styles,
  colors,
} from "../../src/components/ui";
export default function Chat() {
  useAppearance();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  return (
    <ChatRoomScreen key={`${id}:${session?.user.id ?? "guest"}`} id={id} />
  );
}
function ChatRoomScreen({ id }: { id: string }) {
  useAppearance();

  const insets = useSafeAreaInsets();
  const { session, profile, loading } = useAuth(),
    cache = useQueryClient();
  const [focused, setFocused] = useState(false),
    [active, setActive] = useState(AppState.currentState === "active");
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const l = AppState.addEventListener("change", (s) =>
      setActive(s === "active"),
    );
    return () => l.remove();
  }, []);
  const room = useChatRoom(id, focused && active),
    members = useChatMembers(
      id,
      focused && active && !!room.data,
      room.data?.kind,
    );
  const own = members.data?.find((m) => m.user_id === session?.user.id),
    allowed = own?.status === "active";
  const messages = useChatMessages(
    id,
    focused && active && allowed && !!room.data && !room.isError,
  );
  const inviter = useProfile(
    own?.invited_by ?? room.data?.created_by ?? undefined,
  );
  const other = members.data?.find((m) => m.user_id !== session?.user.id);
  const roomTitle =
    room.data?.kind === "direct"
      ? (other?.profiles?.display_name ??
        inviter.data?.display_name ??
        "Özel sohbet")
      : (room.data?.title ?? "Sohbet");
  const [photo, setPhoto] = useState<ChatPhotoDraft | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [info, setInfo] = useState(false),
    [invite, setInvite] = useState(false),
    [people, setPeople] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<ChatMessage | null>(null),
    [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<{
    label: string;
    body: string;
    action: () => Promise<void>;
  } | null>(null);
  const attempt = useRef<{ id: string; body: string; room: string } | null>(
      null,
    ),
    sending = useRef(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const data = messages.data?.pages.flat() ?? [];
  const newestId = data[0]?.id;
  const directUnavailable =
    room.data?.kind === "direct" &&
    (!other || !["active", "invited"].includes(other.status));
  const privateRoom = room.data?.kind !== "community",
    owner = room.data?.created_by === session?.user.id;
  useEffect(() => {
    if (
      !focused ||
      !active ||
      !allowed ||
      !atBottom ||
      !messages.isSuccess ||
      room.isError
    )
      return;
    void Promise.resolve(db().rpc("chat_mark_read", { target: id })).then(
      (r) => {
        if (!r.error) {
          void cache.invalidateQueries({ queryKey: ["chat", "unread"] });
          void cache.invalidateQueries({ queryKey: ["chat", "inbox"] });
        }
      },
    );
  }, [
    focused,
    active,
    allowed,
    atBottom,
    messages.isSuccess,
    room.isError,
    newestId,
    id,
    cache,
  ]);
  function clearHistory() {
    for (const part of ["messages", "members", "room"])
      cache.removeQueries({ queryKey: ["chat", part, session?.user.id, id] });
  }
  async function call(name: string, args: Record<string, unknown>) {
    const r = await db().rpc(name, args);
    if (r.error) throw r.error;
    if (name === "chat_block_user")
      await Promise.all(
        [
          "social",
          "social-list",
          "feed",
          "post",
          "document-notes",
          "guide-community-tips",
        ].map((key) => cache.invalidateQueries({ queryKey: [key] })),
      );
    return r.data;
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setConfirm(null);
      void cache.invalidateQueries({ queryKey: ["chat"] });
    } catch (e) {
      setError(chatError(e));
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (sending.current || (!text.trim() && !photo)) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const body = text.trim();
    try {
      if (photo && session) {
        await sendChatPhoto(photo, id, session.user.id);
        setPhoto(null);
        await cache.invalidateQueries({ queryKey: ["chat"] });
        if (!body) return;
      }
      if (
        !attempt.current ||
        attempt.current.body !== body ||
        attempt.current.room !== id
      )
        attempt.current = { id: randomUUID(), body, room: id };
      await call("chat_send", {
        target: id,
        message_body: body,
        client_id: attempt.current.id,
      });
      attempt.current = null;
      setText("");
      await cache.invalidateQueries({
        queryKey: ["chat", "messages", session?.user.id, id],
      });
      void cache.invalidateQueries({ queryKey: ["chat", "inbox"] });
      list.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e) {
      setError(chatError(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (loading) return <Busy />;
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Mesajlaşmak için giriş yap"
          action="Giriş yap"
          onPress={() => router.push("/auth")}
        />
      </View>
    );
  if (room.isError || members.isError)
    return (
      <View style={styles.content}>
        <Empty
          title="Sohbet açılamadı"
          body={chatError(room.error ?? members.error)}
          action="Mesajlara dön"
          onPress={() => router.replace("/messages")}
        />
      </View>
    );
  if (room.isPending || members.isPending) return <Busy />;
  if (own?.status === "invited")
    return (
      <View style={styles.content}>
        <Stack.Screen options={{ title: "Sohbet isteği" }} />
        <Text style={styles.title}>{roomTitle}</Text>
        <Text style={styles.text}>
          @{inviter.data?.username ?? "Üye"} seni{" "}
          {room.data.kind === "group" ? "grup sohbetine" : "özel sohbete"} davet
          etti. Kabul ettiğinde oda katılımcılarını ve mesaj geçmişini
          görebilirsin.
        </Text>
        <Message text={error} />
        <Button
          label="Sohbet isteğini kabul et"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await call("chat_answer_invite", {
                target: id,
                accept_invite: true,
              });
            })
          }
        />
        <Button
          secondary
          label="İsteği reddet"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await call("chat_answer_invite", {
                target: id,
                accept_invite: false,
              });
              clearHistory();
              router.replace("/messages");
            })
          }
        />
        {!!own.invited_by && (
          <Button
            secondary
            label="Davet eden kişiyi engelle"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await call("chat_block_user", {
                  target_user: own.invited_by,
                  block_user: true,
                });
                clearHistory();
                router.replace("/messages");
              })
            }
          />
        )}
      </View>
    );
  if (!allowed)
    return (
      <View style={styles.content}>
        <Empty
          title="Bu sohbetin katılımcısı değilsin"
          action="Mesajlara dön"
          onPress={() => router.replace("/messages")}
        />
      </View>
    );
  const seenBy = (m: ChatMessage) =>
    members.data.filter(
      (person) =>
        person.user_id !== session.user.id &&
        person.status === "active" &&
        Date.parse(person.last_read_at) >= Date.parse(m.created_at),
    ).length;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 56 + insets.top : 0}
    >
      <Stack.Screen
        options={{
          title: roomTitle,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sohbet bilgileri"
              onPress={() => setInfo(true)}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={23}
                color={colors.muted}
              />
            </Pressable>
          ),
        }}
      />
      {room.data.kind === "direct" && other?.status === "invited" && (
        <Text style={[styles.muted, { padding: 12, textAlign: "center" }]}>
          Sohbet isteği gönderildi. Kabul edilene kadar en fazla 3 mesaj
          iletebilirsin.
        </Text>
      )}
      {directUnavailable && (
        <Text style={[styles.muted, { padding: 12, textAlign: "center" }]}>
          Bu sohbet şu anda yeni mesaj kabul etmiyor.
        </Text>
      )}
      {room.data.closed_at && (
        <Text style={[styles.muted, { padding: 12, textAlign: "center" }]}>
          Bu grup kapatıldı. Geçmişi okuyabilirsin.
        </Text>
      )}
      <FlatList
        ref={list}
        inverted
        onScroll={(event) =>
          setAtBottom(event.nativeEvent.contentOffset.y < 80)
        }
        scrollEventThrottle={200}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        data={data}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: m, index }) => {
          const mine = m.sender_id === session.user.id,
            day = formatDate(m.created_at),
            older = data[index + 1];
          return (
            <View style={{ gap: 8 }}>
              {(!older || formatDate(older.created_at) !== day) && (
                <Text
                  style={[
                    styles.muted,
                    {
                      textAlign: "center",
                      fontSize: textSize(11),
                      marginVertical: 6,
                    },
                  ]}
                >
                  {day}
                </Text>
              )}
              <View
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "87%",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 18,
                  borderBottomRightRadius: mine ? 5 : 18,
                  borderBottomLeftRadius: mine ? 18 : 5,
                  backgroundColor: mine
                    ? themeColor("#24766C", "surface")
                    : themeColor("#FFF", "surface"),
                  gap: 5,
                }}
              >
                {!mine && (
                  <Text
                    style={{
                      fontSize: textSize(11),
                      fontWeight: "700",
                      color: colors.blue,
                    }}
                  >
                    @{m.profiles?.username ?? "Üye"}
                  </Text>
                )}
                {!m.hidden_at && m.image_path && (
                  <ChatPhoto path={m.image_path} />
                )}
                {!m.hidden_at && m.shared_post_id && (
                  <ChatSharedPost id={m.shared_post_id} />
                )}
                {((!m.image_path && !m.shared_post_id) || !!m.hidden_at) && (
                  <Text
                    selectable
                    style={{
                      fontSize: textSize(15),
                      lineHeight: 22,
                      color: mine ? themeColor("#FFF", "text") : colors.text,
                      fontStyle: m.hidden_at ? "italic" : "normal",
                    }}
                  >
                    {m.hidden_at ? "Mesaj kaldırıldı" : m.body}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${m.profiles?.username ?? "Üye"}: ${m.hidden_at ? "Mesaj kaldırıldı" : m.body}`}
                  onPress={() => {
                    setSelected(m);
                    setReason("");
                    setError("");
                  }}
                  hitSlop={8}
                  style={{
                    alignSelf: "flex-end",
                    minHeight: 28,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: textSize(10),
                      color: mine
                        ? themeColor("#D8ECE6", "text")
                        : colors.muted,
                      alignSelf: "flex-end",
                    }}
                  >
                    {formatDateTime(m.created_at).split(" ").pop()}
                    {mine && privateRoom && seenBy(m) > 0
                      ? ` · ${room.data.kind === "direct" ? "Görüldü" : `${seenBy(m)} kişi gördü`}`
                      : ""}
                  </Text>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={14}
                    color={mine ? "#D8ECE6" : colors.muted}
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          messages.isPending ? (
            <Busy />
          ) : messages.isError ? (
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <Empty
                title="Mesajlar yüklenemedi"
                action="Yeniden dene"
                onPress={() => void messages.refetch()}
              />
            </View>
          ) : (
            <View style={{ transform: [{ scaleY: -1 }], padding: 20 }}>
              <Text style={[styles.muted, { textAlign: "center" }]}>
                İlk mesajı sen gönder.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          messages.hasNextPage ? (
            <Button
              secondary
              label="Önceki mesajları yükle"
              disabled={messages.isFetchingNextPage}
              onPress={() => void messages.fetchNextPage()}
            />
          ) : undefined
        }
      />
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 14),
          paddingTop: 10,
          backgroundColor: themeColor("#FFF", "surface"),
          borderTopWidth: 1,
          borderTopColor: themeColor("#E5EAE5", "border"),
          gap: 7,
        }}
      >
        <Message text={error} />
        {photo && (
          <View style={styles.row}>
            <Image
              source={`data:${photo.mime};base64,${photo.base64}`}
              contentFit="contain"
              style={{ width: 76, height: 76, borderRadius: 10 }}
            />
            <Button
              secondary
              label="Fotoğrafı kaldır"
              disabled={busy}
              onPress={() => {
                void discardChatPhoto(photo)
                  .then(() => setPhoto(null))
                  .catch(() =>
                    setError("Fotoğraf kaldırılamadı. Yeniden dene."),
                  );
              }}
            />
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          {room.data.kind === "direct" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Galeriden fotoğraf ekle"
              disabled={
                busy ||
                !!photo ||
                !!room.data.closed_at ||
                directUnavailable ||
                other?.status !== "active"
              }
              onPress={() => {
                void pickChatPhoto()
                  .then((p) => p && setPhoto(p))
                  .catch((e) =>
                    setError(
                      e instanceof Error ? e.message : "Fotoğraf seçilemedi.",
                    ),
                  );
              }}
              style={{
                width: 44,
                height: 46,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="image-outline" size={24} color={colors.blue} />
            </Pressable>
          )}
          <TextInput
            accessibilityLabel="Mesajın"
            placeholder="Bir mesaj yaz…"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            maxLength={2000}
            multiline
            editable={!busy && !room.data.closed_at && !directUnavailable}
            style={[
              styles.input,
              {
                flex: 1,
                minHeight: 46,
                maxHeight: 120,
                paddingVertical: 12,
                backgroundColor: themeColor("#F4F6F1", "surface"),
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={busy ? "Gönderiliyor" : "Mesaj gönder"}
            disabled={
              busy ||
              (!text.trim() && !photo) ||
              !!room.data.closed_at ||
              directUnavailable
            }
            onPress={() => void send()}
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              backgroundColor: themeColor("#24766C", "surface"),
              alignItems: "center",
              justifyContent: "center",
              opacity:
                busy ||
                (!text.trim() && !photo) ||
                room.data.closed_at ||
                directUnavailable
                  ? 0.45
                  : 1,
            }}
          >
            <Ionicons
              name="send"
              color={themeColor("#FFF", "text")}
              size={20}
            />
          </Pressable>
        </View>
      </View>
      <Sheet
        title="Sohbet bilgileri"
        visible={info}
        onClose={() => setInfo(false)}
      >
        <Text style={styles.heading}>{roomTitle}</Text>
        <Text style={styles.muted}>
          {room.data.kind === "community"
            ? "Bu ülkeyi takip eden ve odaya katılan üyeler mesajları görebilir. Takibi bırakırsan odaya erişimin kapanır."
            : "Mesaj geçmişi yalnız daveti kabul etmiş oda üyelerine açıktır. Bildirilen tekil mesajlar inceleme için yönetimle paylaşılabilir."}
        </Text>
        {members.data.map((m) => (
          <View key={m.user_id} style={{ gap: 8, paddingVertical: 5 }}>
            <View style={styles.row}>
              <Avatar
                name={m.profiles?.display_name ?? "Üye"}
                url={m.profiles?.avatar_url}
                size={30}
              />
              <Text style={styles.pillText}>
                @{m.profiles?.username ?? "Üye"}
                {m.user_id === room.data.created_by &&
                room.data.kind === "group"
                  ? " · Grup sahibi"
                  : ""}
              </Text>
              <Text style={styles.muted}>
                {m.status === "invited"
                  ? "Davet bekliyor"
                  : m.status === "left"
                    ? "Ayrıldı"
                    : m.status === "declined"
                      ? "Reddetti"
                      : ""}
              </Text>
            </View>
            {m.user_id !== session.user.id && (
              <Button
                secondary
                disabled={busy}
                label={`@${m.profiles?.username ?? "Üye"} kişisini engelle`}
                onPress={() => {
                  setInfo(false);
                  setConfirm({
                    label: "Kişiyi engelle",
                    body: "Bu kişi sana birebir mesaj veya yeni davet gönderemez. Eski mesajlar ve ortak grup/topluluk mesajları görünmeye devam edebilir. Engeli Mesajlar ekranından kaldırabilirsin.",
                    action: async () => {
                      await call("chat_block_user", {
                        target_user: m.user_id,
                        block_user: true,
                      });
                    },
                  });
                }}
              />
            )}
            {owner &&
              room.data.kind === "group" &&
              m.user_id !== session.user.id &&
              ["active", "invited"].includes(m.status) && (
                <Button
                  secondary
                  disabled={busy}
                  label={`@${m.profiles?.username ?? "Üye"} kişisini gruptan çıkar`}
                  onPress={() => {
                    setInfo(false);
                    setConfirm({
                      label: "Gruptan çıkar",
                      body: "Bu üyenin gruba ve geçmiş mesajlara erişimi kapanacak.",
                      action: async () => {
                        await call("chat_leave", {
                          target: id,
                          remove_user: m.user_id,
                        });
                      },
                    });
                  }}
                />
              )}
          </View>
        ))}
        {owner && room.data.kind === "group" && !room.data.closed_at && (
          <Button
            label="Gruba kişi davet et"
            onPress={() => {
              setInfo(false);
              setPeople([]);
              setInvite(true);
            }}
          />
        )}
        {room.data.kind === "group" && (
          <Button
            secondary
            label="Gruptan ayrıl"
            onPress={() => {
              setInfo(false);
              setConfirm({
                label: "Gruptan ayrıl",
                body: owner
                  ? "Grup sahipliği başka bir aktif üyeye geçer. Başka aktif üye yoksa grup kapanır."
                  : "Grup ve mesaj geçmişine erişimin kapanacak.",
                action: async () => {
                  await call("chat_leave", { target: id });
                  clearHistory();
                  router.replace("/messages");
                },
              });
            }}
          />
        )}
        {owner && room.data.kind === "group" && !room.data.closed_at && (
          <Button
            secondary
            label="Grubu kapat"
            onPress={() => {
              setInfo(false);
              setConfirm({
                label: "Grubu kapat",
                body: "Yeni mesaj gönderilemeyecek. Mevcut üyeler geçmişi okuyabilecek.",
                action: async () => {
                  await call("chat_close_group", { target: id });
                },
              });
            }}
          />
        )}
      </Sheet>
      <Sheet
        title="Gruba davet et"
        visible={invite}
        onClose={() => setInvite(false)}
      >
        <Text style={styles.muted}>
          Davet kabul edildiğinde kişi bu grubun önceki mesajlarını da
          görebilir.
        </Text>
        <ChatPeoplePicker
          selected={people}
          onChange={setPeople}
          disabled={busy}
          max={Math.max(
            0,
            10 -
              members.data.filter((m) =>
                ["active", "invited"].includes(m.status),
              ).length,
          )}
        />
        <Button
          label="Seçilen kişilere davet gönder"
          disabled={busy || !people.length}
          onPress={() =>
            void run(async () => {
              await call("chat_invite_members", {
                target: id,
                recipients: people.map((p) => p.id),
              });
              setInvite(false);
              setPeople([]);
            })
          }
        />
        <Message text={error} />
      </Sheet>
      <Sheet
        title="Mesaj seçenekleri"
        visible={!!selected}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.text} numberOfLines={5}>
          {selected?.hidden_at ? "Mesaj kaldırıldı" : selected?.body}
        </Text>
        {selected &&
          !selected.hidden_at &&
          (selected.sender_id === session.user.id ||
            ((profile?.role === "admin" || profile?.role === "moderator") &&
              room.data.kind === "community")) && (
            <Button
              secondary
              label="Mesajı kaldır"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await call("chat_hide_message", { target: selected.id });
                  setSelected(null);
                })
              }
            />
          )}
        {selected &&
          !selected.hidden_at &&
          selected.sender_id !== session.user.id && (
            <>
              <Text style={styles.muted}>
                Bildirirken yalnız bu mesajın metni ve gerekçen yönetimle
                paylaşılır; özel sohbetin tamamı açılmaz.
              </Text>
              <Field
                label="Bildirim gerekçesi"
                value={reason}
                onChangeText={setReason}
                placeholder="Örn. hakaret, spam…"
                multiline
                maxLength={500}
              />
              <Button
                label="Mesajı yönetime bildir"
                disabled={busy || reason.trim().length < 2}
                onPress={() =>
                  void run(async () => {
                    await call("chat_report_message", {
                      target: selected.id,
                      report_reason: reason,
                    });
                    setSelected(null);
                    setReason("");
                  })
                }
              />
            </>
          )}
        {selected?.profiles?.username && (
          <Button
            secondary
            label="Gönderenin profiline git"
            onPress={() => {
              const username = selected.profiles!.username;
              setSelected(null);
              router.push(`/profile/${username}`);
            }}
          />
        )}
        {selected && selected.sender_id !== session.user.id && (
          <Button
            secondary
            label="Bu göndereni engelle"
            onPress={() => {
              const sender = selected.sender_id;
              setSelected(null);
              setConfirm({
                label: "Kişiyi engelle",
                body: "Birebir mesajlar ve yeni davetler engellenir. Ortak grup ve topluluk mesajları görünmeye devam edebilir.",
                action: async () => {
                  await call("chat_block_user", {
                    target_user: sender,
                    block_user: true,
                  });
                },
              });
            }}
          />
        )}
        <Message text={error} />
      </Sheet>
      <Sheet
        title={confirm?.label ?? "İşlemi onayla"}
        visible={!!confirm}
        onClose={() => setConfirm(null)}
      >
        <Text style={styles.text}>{confirm?.body}</Text>
        <Button
          label={confirm?.label ?? "Onayla"}
          disabled={busy}
          onPress={() => {
            if (confirm) void run(confirm.action);
          }}
        />
        <Message text={error} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
