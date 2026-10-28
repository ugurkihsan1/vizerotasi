import { useAppearance, textSize, themeColor } from "../../src/lib/appearance";
import { PlaneReaction } from "../../src/components/PlaneReaction";
import { useCallback, useRef, useState } from "react";
import { FlatList, View, Text, Pressable } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../src/lib/auth";
import { db } from "../../src/lib/supabase";
import {
  groupError,
  useSharingGroup,
  useGroupFeed,
  type GroupPost,
  type GroupComment,
  type GroupMember,
  type SharingGroup,
} from "../../src/lib/groups";
import { formatDateTime, relativePostTime } from "../../src/lib/dates";
import { Avatar } from "../../src/components/PostCard";
import {
  styles,
  colors,
  Button,
  Field,
  Sheet,
  Message,
  Busy,
} from "../../src/components/ui";

function GroupPostCard({
  post,
  group,
  act,
  onComments,
  onDelete,
  busy,
}: {
  post: GroupPost;
  group: SharingGroup;
  act: (name: string, args: Record<string, unknown>) => Promise<boolean>;
  onComments: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  useAppearance();

  const { session } = useAuth();
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.card, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar
          name={post.author.display_name}
          url={post.author.avatar_url}
          size={34}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.pillText}>{post.author.display_name}</Text>
          <Text style={[styles.muted, { fontSize: textSize(11) }]}>
            {relativePostTime(post.created_at)}
          </Text>
        </View>
        {(group.is_manager || session?.user.id === post.user_id) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Paylaşım seçenekleri"
            onPress={onDelete}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={21}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>
      <Text style={styles.text} numberOfLines={expanded ? undefined : 5}>
        {post.body}
      </Text>
      {(post.body.length > 220 || post.body.split("\n").length > 5) && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(!expanded)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: colors.blue, fontSize: textSize(13) }}>
            {expanded ? "Daha az göster" : "Devamını oku"}
          </Text>
        </Pressable>
      )}
      <View
        style={{
          flexDirection: "row",
          gap: 20,
          borderTopWidth: 1,
          borderTopColor: themeColor("#EDF0EB", "border"),
          paddingTop: 4,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.liked ? "Beğeniyi geri al" : "Beğen"}
          accessibilityState={{ selected: post.liked }}
          disabled={busy}
          onPress={() =>
            void act("sharing_like", {
              target_post: post.id,
              liked: !post.liked,
            })
          }
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <PlaneReaction active={post.liked} />
          <Text style={styles.muted}>{post.like_count} beğeni</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yorumları aç"
          onPress={onComments}
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.muted} />
          <Text style={styles.muted}>{post.comment_count} yorum</Text>
        </Pressable>
      </View>
    </View>
  );
}
export default function GroupRoute() {
  useAppearance();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  return <GroupScreen key={`${id}:${session?.user.id ?? "guest"}`} id={id} />;
}
export function GroupScreen({
  id,
  top,
  onDeleted,
}: {
  id: string;
  top?: React.ReactNode;
  onDeleted?: () => void;
}) {
  useAppearance();

  const { session, profile } = useAuth(),
    q = useSharingGroup(id),
    g = q.data,
    cache = useQueryClient();
  const canRead =
    !!session && !!g && (g.my_status === "active" || g.is_manager);
  const feed = useGroupFeed(id, canRead);
  const [busy, setBusy] = useState(false),
    lock = useRef(false),
    [error, setError] = useState(""),
    [compose, setCompose] = useState(false),
    [body, setBody] = useState(""),
    nonce = useRef<string | null>(null);
  const [manage, setManage] = useState(false),
    [comments, setComments] = useState<GroupPost | null>(null),
    [deleting, setDeleting] = useState<GroupPost | null>(null),
    [leave, setLeave] = useState(false),
    [deleteGroup, setDeleteGroup] = useState(false);
  const refresh = q.refetch,
    refreshFeed = feed.refetch;
  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (canRead) void refreshFeed();
    }, [refresh, refreshFeed, canRead]),
  );
  async function act(name: string, args: Record<string, unknown>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await db().rpc(name, args);
      if (r.error) throw r.error;
      await cache.invalidateQueries({ queryKey: ["groups"] });
      return true;
    } catch (e) {
      setError(groupError(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function publish() {
    if (!body.trim()) return;
    nonce.current ??= Crypto.randomUUID();
    if (
      await act("sharing_publish", {
        target: id,
        post_body: body.trim(),
        client_id: nonce.current,
      })
    ) {
      setCompose(false);
      setBody("");
      nonce.current = null;
    }
  }
  if (q.isPending)
    return (
      <View style={styles.content}>
        {top}
        <Busy />
      </View>
    );
  if (q.isError || !g)
    return (
      <View style={styles.content}>
        {top}
        <Text style={styles.muted}>
          {q.isError ? groupError(q.error) : "Grup bulunamadı."}
        </Text>
        <Button label="Yeniden dene" onPress={() => void q.refetch()} />
      </View>
    );
  const canDelete =
    !!session &&
    (g.owner_id === session.user.id ||
      g.is_manager ||
      profile?.role === "admin");
  const ownerPower =
    g.owner_id === session?.user.id ||
    (g.is_system &&
      (profile?.role === "admin" || profile?.role === "moderator"));
  return (
    <>
      <FlatList
        style={styles.page}
        contentContainerStyle={styles.content}
        data={canRead ? (feed.data?.pages.flat() ?? []) : []}
        keyExtractor={(p) => p.id}
        refreshing={feed.isRefetching || q.isRefetching}
        onRefresh={() => {
          void q.refetch();
          if (canRead) void feed.refetch();
        }}
        onEndReached={() => {
          if (canRead && feed.hasNextPage && !feed.isFetchingNextPage)
            void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 4 }}>
            {top}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 20,
                  backgroundColor: themeColor("#EDE8F8", "surface"),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={g.is_system ? "school-outline" : "people-outline"}
                  size={29}
                  color={themeColor("#71579D", "text")}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title}>{g.name}</Text>
                <Text style={styles.muted}>
                  {g.member_count} üye · Yönetici onaylı
                </Text>
              </View>
              {(canRead || canDelete) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Grup bilgisi ve yönetimi"
                  onPress={() => setManage(true)}
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
                    color={colors.navy}
                  />
                </Pressable>
              )}
            </View>
            {!canRead && (
              <View style={[styles.card, { padding: 16 }]}>
                <Text style={styles.text}>{g.description}</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={colors.muted}
                  />
                  <Text style={[styles.muted, { flex: 1 }]}>
                    Paylaşımlar yalnız onaylı üyelere görünür.
                  </Text>
                </View>
                {!session ? (
                  <Button
                    label="Giriş yap ve katıl"
                    onPress={() => router.push("/auth")}
                  />
                ) : g.my_status === "pending" ? (
                  <>
                    <Text style={{ color: colors.amber, fontWeight: "600" }}>
                      Katılım isteğin onay bekliyor
                    </Text>
                    <Button
                      secondary
                      label="İsteği geri çek"
                      disabled={busy}
                      onPress={() => void act("sharing_leave", { target: id })}
                    />
                  </>
                ) : g.my_status === "removed" ? (
                  <Text style={styles.muted}>
                    Bu gruba katılımın kapatıldı.
                  </Text>
                ) : (
                  <Button
                    label={
                      g.my_status === "declined"
                        ? "Yeniden katılım isteği gönder"
                        : "Katılma isteği gönder"
                    }
                    disabled={busy}
                    onPress={() => void act("sharing_request", { target: id })}
                  />
                )}
              </View>
            )}
            {canRead && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Grupta paylaşım yap"
                onPress={() => setCompose(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 14,
                  backgroundColor: themeColor("#FFF", "surface"),
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: themeColor("#E4E9E2", "border"),
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={colors.blue}
                />
                <Text style={[styles.muted, { flex: 1 }]}>
                  Bir şey paylaş veya soru sor…
                </Text>
              </Pressable>
            )}
            {g.is_manager && g.request_count > 0 && (
              <Button
                secondary
                label={`${g.request_count} katılım isteğini incele`}
                onPress={() => setManage(true)}
              />
            )}
            <Message text={error} />
          </View>
        }
        renderItem={({ item }) => (
          <GroupPostCard
            post={item}
            group={g}
            act={act}
            busy={busy}
            onComments={() => setComments(item)}
            onDelete={() => setDeleting(item)}
          />
        )}
        ListEmptyComponent={
          canRead ? (
            feed.isPending ? (
              <Busy />
            ) : feed.isError ? (
              <View style={styles.card}>
                <Text style={styles.muted}>{groupError(feed.error)}</Text>
                <Button
                  secondary
                  label="Yeniden yükle"
                  onPress={() => void feed.refetch()}
                />
              </View>
            ) : (
              <Text style={[styles.muted, { padding: 8 }]}>
                İlk paylaşımı sen yap.
              </Text>
            )
          ) : undefined
        }
        ListFooterComponent={feed.isFetchingNextPage ? <Busy /> : undefined}
      />
      <Sheet
        visible={compose && canRead}
        title="Grupta paylaş"
        onClose={() => !busy && setCompose(false)}
      >
        <Text style={styles.muted}>{g.name} · Yalnız grup üyeleri</Text>
        <Field
          label="Paylaşımın"
          placeholder="Erasmus hazırlığında aklına takılan bir şey mi var?"
          value={body}
          onChangeText={(v) => {
            setBody(v);
            nonce.current = null;
          }}
          maxLength={5000}
          multiline
          editable={!busy}
        />
        <Message text={error} />
        <Button
          label="Paylaş"
          disabled={busy || !body.trim()}
          onPress={() => void publish()}
        />
      </Sheet>
      <Sheet
        visible={!!deleting && canRead}
        title="Paylaşım seçenekleri"
        onClose={() => setDeleting(null)}
      >
        <Text style={styles.muted}>
          Bu paylaşımı ve altındaki yorumları gruptan kaldırabilirsin.
        </Text>
        <Message text={error} />
        <Button
          label="Paylaşımı sil"
          disabled={busy}
          onPress={() => {
            if (deleting)
              void act("sharing_delete", { target: deleting.id }).then((ok) => {
                if (ok) setDeleting(null);
              });
          }}
        />
      </Sheet>
      <Sheet
        visible={leave}
        title="Gruptan ayrıl"
        onClose={() => setLeave(false)}
      >
        <Text style={styles.text}>
          Ayrılınca paylaşımlara erişimin kapanır. Yeniden katılmak için onay
          gerekir.
        </Text>
        <Message text={error} />
        <Button
          label="Gruptan ayrıl"
          disabled={busy}
          onPress={() =>
            void act("sharing_leave", { target: id }).then((ok) => {
              if (ok) {
                cache.removeQueries({
                  queryKey: ["groups", session?.user.id, id],
                });
                setLeave(false);
                setManage(false);
                router.replace("/groups");
              }
            })
          }
        />
      </Sheet>
      <Sheet
        visible={manage && (canRead || canDelete)}
        title="Grup bilgisi"
        onClose={() => setManage(false)}
      >
        <Text style={styles.text}>{g.description || g.name}</Text>
        <Text style={styles.muted}>
          Onaylı üyeler gruptaki önceki paylaşımları da görebilir. İçerikler
          resmî vize bilgisi değildir.
        </Text>
        {g.is_manager && manage && (
          <GroupMembers
            id={id}
            ownerPower={ownerPower}
            ownerId={g.owner_id}
            act={act}
            busy={busy}
          />
        )}
        <Message text={error} />
        {canRead &&
          g.owner_id !== session?.user.id &&
          !(g.is_system && ownerPower) && (
            <Button
              secondary
              label="Gruptan ayrıl"
              onPress={() => {
                setManage(false);
                setLeave(true);
              }}
            />
          )}
        {canDelete && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError("");
              setManage(false);
              setDeleteGroup(true);
            }}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={{ color: colors.red, fontWeight: "700" }}>
              Topluluğu sil
            </Text>
          </Pressable>
        )}
        {g.owner_id === session?.user.id && (
          <Text style={styles.muted}>
            Ayrılmak için önce bir üyeye sahipliği devret.
          </Text>
        )}
      </Sheet>
      <Sheet
        visible={deleteGroup && canDelete}
        title="Topluluğu sil"
        onClose={() => !busy && setDeleteGroup(false)}
      >
        <Text style={styles.text}>
          {g.name} topluluğu, paylaşımları ve yorumları kalıcı olarak silinecek.
          Bu işlem geri alınamaz.
        </Text>
        <Message text={error} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Topluluğu kalıcı olarak sil"
          disabled={busy}
          onPress={() => {
            void act("sharing_remove_group", { target: id }).then((ok) => {
              if (!ok) return;
              cache.removeQueries({
                queryKey: ["groups", session?.user.id, id],
              });
              setDeleteGroup(false);
              if (onDeleted) onDeleted();
              else router.replace("/");
            });
          }}
          style={{
            minHeight: 48,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: themeColor("#FBE4E2", "surface"),
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.red, fontWeight: "700" }}>
            {busy ? "Siliniyor…" : "Topluluğu kalıcı olarak sil"}
          </Text>
        </Pressable>
        <Button
          secondary
          label="Vazgeç"
          disabled={busy}
          onPress={() => setDeleteGroup(false)}
        />
      </Sheet>
      {comments && canRead && (
        <GroupComments
          key={comments.id}
          post={comments}
          isManager={g.is_manager}
          close={() => setComments(null)}
          act={act}
          busy={busy}
          error={error}
        />
      )}
    </>
  );
}
function GroupMembers({
  id,
  ownerPower,
  ownerId,
  act,
  busy,
}: {
  id: string;
  ownerPower: boolean;
  ownerId: string | null;
  act: (name: string, args: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  useAppearance();

  const { session } = useAuth();
  const [selected, setSelected] = useState<GroupMember | null>(null),
    [confirmTransfer, setConfirmTransfer] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ["groups", session?.user.id, id, "members"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db()
        .from("sharing_group_members")
        .select(
          "user_id,status,role,profiles(display_name,username,avatar_url)",
        )
        .eq("group_id", id)
        .in("status", ["active", "pending", "removed"])
        .order("created_at", { ascending: false })
        .order("user_id")
        .range(pageParam, pageParam + 29);
      if (r.error) throw r.error;
      return r.data as unknown as GroupMember[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 30 ? pages.length * 30 : undefined,
  });
  const members = q.data?.pages.flat() ?? [];
  async function decide(m: GroupMember, decision: string) {
    if (
      await act("sharing_manage", {
        target: id,
        member_id: m.user_id,
        decision,
      })
    ) {
      setSelected(null);
      setConfirmTransfer(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Text style={styles.heading}>Üyeler ve istekler</Text>
        <Button secondary label="Yenile" onPress={() => void q.refetch()} />
      </View>
      {q.isPending && <Busy />}
      {q.isError && <Text style={styles.muted}>{groupError(q.error)}</Text>}
      {members.map((m) => (
        <View
          key={m.user_id}
          style={{
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: themeColor("#E4E9E2", "border"),
            paddingBottom: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar
              name={m.profiles.display_name}
              url={m.profiles.avatar_url}
              size={32}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.pillText}>{m.profiles.display_name}</Text>
              <Text style={styles.muted}>
                @{m.profiles.username} ·{" "}
                {m.status === "pending"
                  ? "Onay bekliyor"
                  : m.status === "removed"
                    ? "Çıkarıldı"
                    : m.user_id === ownerId
                      ? "Grup sahibi"
                      : m.role === "manager"
                        ? "Yönetici"
                        : "Üye"}
              </Text>
            </View>
            {m.user_id !== session?.user.id &&
              m.user_id !== ownerId &&
              (m.role !== "manager" || ownerPower) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${m.profiles.username} üye işlemleri`}
                  onPress={() => {
                    setSelected(selected?.user_id === m.user_id ? null : m);
                    setConfirmTransfer(false);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              )}
          </View>
          {selected?.user_id === m.user_id && (
            <View style={{ gap: 8 }}>
              {m.status === "pending" ? (
                <>
                  <Button
                    label="Katılımı onayla"
                    disabled={busy}
                    onPress={() => void decide(m, "approve")}
                  />
                  <Button
                    secondary
                    label="İsteği reddet"
                    disabled={busy}
                    onPress={() => void decide(m, "decline")}
                  />
                </>
              ) : m.status === "removed" ? (
                <Button
                  secondary
                  label="Yeniden istek gönderebilsin"
                  disabled={busy}
                  onPress={() => void decide(m, "unban")}
                />
              ) : (
                <>
                  <Button
                    secondary
                    label="Gruptan çıkar"
                    disabled={busy}
                    onPress={() => void decide(m, "remove")}
                  />
                  {ownerPower && (
                    <Button
                      secondary
                      label={
                        m.role === "manager"
                          ? "Yöneticiliği kaldır"
                          : "Yönetici yap"
                      }
                      disabled={busy}
                      onPress={() =>
                        void decide(
                          m,
                          m.role === "manager" ? "member" : "manager",
                        )
                      }
                    />
                  )}{" "}
                  {ownerPower &&
                    ownerId &&
                    (!confirmTransfer ? (
                      <Button
                        secondary
                        label="Grup sahipliğini devret"
                        onPress={() => setConfirmTransfer(true)}
                      />
                    ) : (
                      <>
                        <Text style={styles.muted}>
                          Grubun sahibi bu üye olacak. Bu işlemden sonra seni
                          yöneticilikten çıkarabilir.
                        </Text>
                        <Button
                          label="Sahiplik devrini onayla"
                          disabled={busy}
                          onPress={() => void decide(m, "transfer")}
                        />
                      </>
                    ))}
                </>
              )}
            </View>
          )}
        </View>
      ))}
      {q.hasNextPage && (
        <Button
          secondary
          label="Diğer üyeler"
          disabled={q.isFetchingNextPage}
          onPress={() => void q.fetchNextPage()}
        />
      )}
    </View>
  );
}
function GroupComments({
  post,
  isManager,
  close,
  act,
  busy,
  error,
}: {
  post: GroupPost;
  isManager: boolean;
  close: () => void;
  act: (name: string, args: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
  error: string;
}) {
  useAppearance();

  const { session } = useAuth();
  const [body, setBody] = useState(""),
    nonce = useRef<string | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const q = useInfiniteQuery({
    queryKey: ["groups", session?.user.id, post.group_id, "comments", post.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db()
        .from("sharing_group_comments")
        .select(
          "id,user_id,body,created_at,profiles(display_name,username,avatar_url)",
        )
        .eq("post_id", post.id)
        .order("created_at")
        .order("id")
        .range(pageParam, pageParam + 29);
      if (r.error) throw r.error;
      return r.data as unknown as GroupComment[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 30 ? pages.length * 30 : undefined,
  });
  async function send() {
    nonce.current ??= Crypto.randomUUID();
    if (
      await act("sharing_comment", {
        target_post: post.id,
        comment_body: body.trim(),
        client_id: nonce.current,
      })
    ) {
      setBody("");
      nonce.current = null;
    }
  }
  return (
    <Sheet visible title="Yorumlar" onClose={close}>
      <Text
        style={[
          styles.muted,
          {
            borderBottomWidth: 1,
            borderBottomColor: themeColor("#E4E9E2", "border"),
            paddingBottom: 10,
          },
        ]}
        numberOfLines={2}
      >
        {post.body}
      </Text>
      <View style={{ gap: 14 }}>
        {q.isPending && <Busy />}
        {q.isError && (
          <Button
            secondary
            label="Yorumları yeniden yükle"
            onPress={() => void q.refetch()}
          />
        )}
        {q.data?.pages.flat().map((c) => (
          <View key={c.id} style={{ gap: 5 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Avatar
                name={c.profiles.display_name}
                url={c.profiles.avatar_url}
                size={28}
              />
              <Text style={[styles.pillText, { flex: 1 }]}>
                {c.profiles.display_name}
              </Text>
              {(isManager || c.user_id === session?.user.id) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Yorumu sil"
                  onPress={() => setDeleting(c.id)}
                  style={{
                    width: 44,
                    height: 44,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={17}
                    color={colors.muted}
                  />
                </Pressable>
              )}
            </View>
            <Text style={styles.text}>{c.body}</Text>
            <Text style={[styles.muted, { fontSize: textSize(11) }]}>
              {formatDateTime(c.created_at)}
            </Text>
            {deleting === c.id && (
              <Button
                secondary
                label="Yorumu silmeyi onayla"
                disabled={busy}
                onPress={() =>
                  void act("sharing_delete", {
                    target: c.id,
                    is_comment: true,
                  }).then((ok) => {
                    if (ok) setDeleting(null);
                  })
                }
              />
            )}
          </View>
        ))}
      </View>
      {q.hasNextPage && (
        <Button
          secondary
          label="Diğer yorumlar"
          disabled={q.isFetchingNextPage}
          onPress={() => void q.fetchNextPage()}
        />
      )}
      <Field
        label="Yorumun"
        value={body}
        onChangeText={(v) => {
          setBody(v);
          nonce.current = null;
        }}
        placeholder="Bir önerin veya deneyimin var mı?"
        maxLength={2000}
        multiline
        editable={!busy}
      />
      <Message text={error} />
      <Button
        label="Yorumu gönder"
        disabled={busy || !body.trim()}
        onPress={() => void send()}
      />
    </Sheet>
  );
}
