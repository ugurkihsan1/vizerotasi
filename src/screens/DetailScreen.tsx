import { useAppearance, textSize, themeColor } from "../lib/appearance";
import { DeleteContent } from "../components/DeleteContent";
import { PlaneReaction } from "../components/PlaneReaction";
import { EvidencePanel } from "../components/EvidencePanel";
import { formatDate, formatDateTime } from "../lib/dates";
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
import {
  PostCard,
  Avatar,
  ShareButton,
  statusLabels,
} from "../components/PostCard";
import {
  styles,
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
}: {
  postId?: string;
  commentId?: string;
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
        <Text style={{ fontSize: textSize(20) }}>•••</Text>
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
        styles.card,
        {
          padding: 10,
          gap: 4,
          borderRadius: 16,
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
          {formatDateTime(comment.created_at)}
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
        <View style={{ gap: 16 }}>
          <PostCard post={p} detail />
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={styles.heading}>Yorumlar</Text>
            <Button
              secondary
              label="Detaylar"
              onPress={() => setDetails(true)}
            />
          </View>
          <Sheet
            visible={details}
            title="Paylaşım detayları"
            onClose={() => setDetails(false)}
          >
            {p.kind === "experience" && (
              <View style={styles.card}>
                <Text style={styles.heading}>Süreç</Text>
                {[
                  ["Randevu", p.appointment_date],
                  ["Başvuru", p.application_date],
                  ["Karar", p.decision_date],
                  ["Pasaport", p.passport_date],
                ].map(([label, date]) => (
                  <Text key={label} style={styles.text}>
                    ● {label} · {date ? formatDate(date) : "Henüz belirtilmedi"}
                  </Text>
                ))}
                {p.advice && (
                  <>
                    <Text style={styles.heading}>Başvuracak birine not</Text>
                    <Text style={styles.text}>{p.advice}</Text>
                  </>
                )}
              </View>
            )}
            {p.kind === "experience" && !!p.invitation_notes && (
              <View style={styles.card}>
                <Text style={styles.heading}>Davetiye durumu</Text>
                <Text style={styles.muted}>
                  {p.invitation ? "Davetiyesi var" : "Davetiyeye ilişkin not"}
                </Text>
                <Text style={styles.text}>{p.invitation_notes}</Text>
              </View>
            )}
            {p.kind === "experience" && !!p.previous_visas?.length && (
              <View style={styles.card}>
                <Text style={styles.heading}>Önceki Schengen vizeleri</Text>
                {p.previous_visas.map((visa, index) => (
                  <View
                    key={index}
                    style={{
                      gap: 6,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: themeColor("#E4E9E2", "border"),
                    }}
                  >
                    <Text style={styles.pillText}>
                      {index + 1}. {visa.country}
                    </Text>
                    {visa.issue_date && (
                      <Text style={styles.muted}>
                        Veriliş: {formatDate(visa.issue_date)}
                      </Text>
                    )}
                    {!!visa.duration && (
                      <Text style={styles.text}>
                        Vize süresi: {visa.duration}
                      </Text>
                    )}
                    {!!visa.entries && (
                      <Text style={styles.muted}>
                        {
                          {
                            single: "Tek giriş",
                            double: "Çift giriş",
                            multi: "Çok giriş",
                          }[visa.entries]
                        }
                      </Text>
                    )}
                    {!!visa.notes && (
                      <Text style={styles.text}>{visa.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            <EvidencePanel post={p} />
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
            <View style={styles.row}>
              <ShareButton post={p} />
              {p.status === "approved" && <Report postId={id} />}
            </View>
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
        <View style={{ gap: 12, marginTop: 20 }}>
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
