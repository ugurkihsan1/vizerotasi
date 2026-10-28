import { useAppearance, textSize, themeColor } from "../lib/appearance";
import { DeleteContent } from "../components/DeleteContent";
import { PlaneReaction } from "../components/PlaneReaction";
import { PostExtraDetails } from "../components/PostExtraDetails";
import { Ionicons } from "@expo/vector-icons";
import { relativePostTime } from "../lib/dates";
import { useState } from "react";
import { View, Text, FlatList, Linking, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePost,
  useComments,
  useProfile,
  useToggle,
  friendlyError,
} from "../lib/data";
import { db } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Comment } from "../lib/types";
import { PostCard, Avatar, statusLabels } from "../components/PostCard";
import {
  styles,
  colors,
  Button,
  Field,
  Sheet,
  Chip,
  Empty,
  Busy,
  useGate,
  Message,
} from "../components/ui";
const reasons = [
  "Yanlış bilgi",
  "Kişisel bilgi",
  "Spam",
  "Hakaret / taciz",
  "Reklam",
  "Konu dışı",
  "Diğer",
];
export function Report({
  postId,
  commentId,
  label,
}: {
  postId?: string;
  commentId?: string;
  label?: string;
}) {
  useAppearance();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const gate = useGate();
  const { session } = useAuth();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="İçeriği bildir"
        onPress={() => gate.require(() => setOpen(true))}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ fontSize: textSize(label ? 14 : 20), color: colors.muted }}
        >
          {label ?? "•••"}
        </Text>
      </Pressable>
      <Sheet
        title="İçeriği bildir"
        visible={open}
        onClose={() => setOpen(false)}
      >
        {reasons.map((r) => (
          <Chip
            key={r}
            active={reason === r}
            label={r}
            onPress={() => setReason(r)}
          />
        ))}
        <Message text={message} />
        <Button
          label="Bildirimi gönder"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void db()
              .from("reports")
              .insert({
                user_id: session!.user.id,
                post_id: postId ?? null,
                comment_id: commentId ?? null,
                reason,
              })
              .then((r) => {
                setBusy(false);
                setMessage(
                  r.error
                    ? "Bu bildirim gönderilemedi veya zaten mevcut."
                    : "Bildirimin moderasyon ekibine ulaştı.",
                );
              });
          }}
        />
      </Sheet>
      {gate.view}
    </>
  );
}
function CommentRow({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply: () => void;
}) {
  useAppearance();

  const author = useProfile(comment.user_id);
  const { session } = useAuth();
  const gate = useGate();
  const helpful = useToggle("comment_helpful_votes", "comment_id", comment.id);
  const [error, setError] = useState("");
  return (
    <View
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 4,
          gap: 4,
          borderBottomWidth: 1,
          borderBottomColor: themeColor("#E4E9E2", "border"),
          marginLeft: comment.parent_comment_id ? 22 : 0,
        },
      ]}
    >
      <View style={[styles.row, { flexWrap: "nowrap" }]}>
        <Avatar
          size={28}
          name={author.data?.display_name ?? "Üye"}
          url={author.data?.avatar_url}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.pillText} numberOfLines={1}>
            {author.data?.username ?? "Topluluk üyesi"}
          </Text>
        </View>
        <Text style={[styles.muted, { fontSize: textSize(10) }]}>
          {relativePostTime(comment.created_at)}
        </Text>
      </View>
      <Text style={styles.text}>{comment.body}</Text>
      {comment.status !== "approved" && (
        <Text style={styles.muted}>{statusLabels[comment.status]}</Text>
      )}
      <View style={styles.row}>
        {!comment.parent_comment_id && comment.status === "approved" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yanıtla"
            onPress={onReply}
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text style={styles.muted}>Yanıtla</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Faydalı"
          accessibilityState={{ selected: helpful.active }}
          disabled={helpful.pending || session?.user.id === comment.user_id}
          onPress={() =>
            gate.require(() => {
              void helpful
                .toggle()
                .catch(() => setError("Tepki kaydedilemedi."));
            })
          }
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <PlaneReaction active={helpful.active} />
        </Pressable>
        {session?.user.id === comment.user_id ? (
          <DeleteContent id={comment.id} isComment />
        ) : (
          <Report commentId={comment.id} />
        )}
      </View>
      <Message text={error} />
      {gate.view}
    </View>
  );
}
export default function DetailScreen() {
  useAppearance();

  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const comments = useComments(id);
  const { session } = useAuth();
  const gate = useGate();
  const cache = useQueryClient();
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(false);
  const [details, setDetails] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  if (post.isPending) return <Busy />;
  if (!post.data) return <Empty title="Bu içerik artık mevcut değil." />;
  const p = post.data;
  const submit = async () => {
    if (body.trim().length < 2) {
      setMessage("En az 2 karakter yaz.");
      return;
    }
    setBusy(true);
    try {
      const r = await db()
        .from("comments")
        .insert({
          post_id: id,
          user_id: session!.user.id,
          parent_comment_id: reply,
          body: body.trim(),
        })
        .select("status")
        .single();
      if (r.error) throw r.error;
      setBody("");
      setReply(null);
      setMessage(
        r.data?.status === "approved"
          ? "Yorumun yayınlandı."
          : "Yorumun kaydedildi; şu anda inceleme sırasında.",
      );
      void cache.invalidateQueries({ queryKey: ["feed"] });
      void cache.invalidateQueries({ queryKey: ["post", id] });
      void cache.invalidateQueries({ queryKey: ["profile"] });
      void cache.invalidateQueries({ queryKey: ["comments", id] });
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      data={comments.data ?? []}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <CommentRow
          comment={item}
          onReply={() => gate.require(() => setReply(item.id))}
        />
      )}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <PostCard post={p} detail />
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={[styles.pillText, { fontSize: textSize(16) }]}>
              Yorumlar{p.comment_count ? ` · ${p.comment_count}` : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Detaylar"
              onPress={() => setDetails(true)}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Text style={styles.muted}>Detaylar</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          </View>
          <Sheet
            visible={details}
            title="Paylaşım detayları"
            onClose={() => setDetails(false)}
          >
            <PostExtraDetails post={p} />
            {p.source_url && (
              <Button
                label="Kaynağı aç"
                secondary
                onPress={() =>
                  void Linking.openURL(p.source_url!).catch(() =>
                    setMessage("Bağlantı açılamadı."),
                  )
                }
              />
            )}
            {p.status === "approved" && session?.user.id !== p.user_id && (
              <Report postId={id} label="İçeriği bildir" />
            )}
            {session?.user.id === p.user_id &&
              ["needs_revision", "rejected"].includes(p.status) && (
                <Button
                  label="Gönderini düzenle"
                  onPress={() => {
                    setNewTitle(p.title);
                    setNewBody(p.body);
                    setRevision(true);
                  }}
                />
              )}
          </Sheet>

          {comments.isError && (
            <Text style={styles.muted}>Yorumlar yüklenemedi.</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.muted, { padding: 12 }]}>
          İlk yorum senden olsun.
        </Text>
      }
      ListFooterComponent={
        <View style={{ gap: 8, marginTop: 12 }}>
          {reply && (
            <Button
              secondary
              label="Yanıtı iptal et"
              onPress={() => setReply(null)}
            />
          )}
          <Field
            label={reply ? "Yanıtını yaz" : "Bir şey söyle…"}
            value={body}
            onChangeText={setBody}
            multiline
            style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
            maxLength={3000}
          />
          <Message text={message} />
          <Button
            label={busy ? "Gönderiliyor…" : "Yanıtı gönder"}
            disabled={busy || p.status !== "approved"}
            onPress={() => gate.require(() => void submit())}
          />
          {gate.view}
          <Sheet
            title="Gönderini düzenle"
            visible={revision}
            onClose={() => setRevision(false)}
          >
            <Field label="Başlık" value={newTitle} onChangeText={setNewTitle} />
            <Field
              label="Deneyimin"
              value={newBody}
              onChangeText={setNewBody}
              multiline
            />
            <Button
              label="Tekrar incelemeye gönder"
              onPress={() => {
                void db()
                  .rpc("revise_post", {
                    target: id,
                    new_title: newTitle,
                    new_body: newBody,
                  })
                  .then((r) => {
                    if (r.error) setMessage(friendlyError(r.error));
                    else {
                      setRevision(false);
                      void post.refetch();
                    }
                  });
              }}
            />
          </Sheet>
        </View>
      }
    />
  );
}
