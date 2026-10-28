import { useAppearance } from "../lib/appearance";
import { useState, useCallback } from "react";
import { useFocusEffect, useIsFocused } from "expo-router";
import { View, Text, Linking, Pressable } from "react-native";
import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import {
  useEvidence,
  useVerification,
  uploadEvidence,
  type EvidenceDraft,
} from "../lib/evidence";
import {
  documentOptions,
  selectedDocumentPlacement,
} from "../lib/guide-topics";
import type { Post } from "../lib/types";
import { EvidenceUpload } from "./EvidenceUpload";
import { VerificationLabel } from "./VerificationLabel";
import { Button, Field, Message, Sheet, styles } from "./ui";
export function TipPlacementEditor({ post }: { post: Post }) {
  useAppearance();

  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  const { profile } = useAuth();
  if (post.kind !== "tip" || !profile || profile.role === "user") return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.muted}>
        Bağlantı:{" "}
        {selectedDocumentPlacement(
          post.country_id,
          post.category_id ?? "other",
        )}
      </Text>
      <Button
        secondary
        label="Notun belge bağlantısını düzelt"
        onPress={() => setOpen(true)}
      />
      <Sheet
        title="Notun bağlanacağı belge"
        visible={open}
        onClose={() => setOpen(false)}
      >
        {documentOptions(post.country_id).map((d) => (
          <Pressable
            key={d.id}
            accessibilityRole="radio"
            accessibilityLabel={d.name}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void db()
                .rpc("relocate_critical_tip", {
                  target: post.id,
                  new_category: d.id,
                })
                .then((r) => {
                  setBusy(false);
                  if (r.error) setError("Belge bağlantısı güncellenemedi.");
                  else {
                    void cache.invalidateQueries();
                    setOpen(false);
                  }
                });
            }}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={styles.text}>{d.name}</Text>
          </Pressable>
        ))}
        <Message text={error} />
      </Sheet>
    </View>
  );
}
export function EvidencePanel({ post }: { post: Post }) {
  useAppearance();

  const { session, profile } = useAuth();
  const staff = !!profile && profile.role !== "user",
    own = session?.user.id === post.user_id;
  const q = useEvidence(
    post.id,
    (staff || own) && ["experience", "tip"].includes(post.kind),
  );
  const verification = useVerification(post.id);
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<EvidenceDraft[]>([]),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [decision, setDecision] = useState<"verified" | "declined" | null>(null),
    [note, setNote] = useState("");
  const cache = useQueryClient();
  if ((!staff && !own) || !["tip", "experience"].includes(post.kind))
    return null;
  const verified = verification.data?.status === "verified";
  const invalidate = () => {
    void cache.invalidateQueries({ queryKey: ["post-evidence", post.id] });
    void cache.invalidateQueries({ queryKey: ["post-verification"] });
    void cache.invalidateQueries({ queryKey: ["evidence-queue"] });
    void cache.invalidateQueries({ queryKey: ["profile"] });
  };
  return (
    <View style={[styles.card, { gap: 12 }]}>
      <Text style={styles.heading}>Özel belge incelemesi</Text>
      <VerificationLabel postId={post.id} />
      {staff && own && !!q.data?.length && (
        <Text style={styles.muted}>
          Kendi belgelerini başka bir yönetici incelemeli.
        </Text>
      )}
      {!!notice && files.length === 0 && (
        <Text style={styles.pillText}>{notice}</Text>
      )}
      <Text style={styles.muted}>
        Bu belgeler yalnız paylaşımın sahibi ve yönetim tarafından görülebilir.
        Yayın onayından ayrı incelenir.
      </Text>
      {q.isError && (
        <Text style={styles.muted}>
          Özel belgeler yüklenemedi. Veritabanı güncellemesini ve bağlantını
          kontrol et.
        </Text>
      )}
      {q.data?.map((f) => (
        <View key={f.id} style={{ gap: 5 }}>
          <Text style={styles.text}>
            {f.file_name} · {Math.ceil(f.size_bytes / 1024)} KB
          </Text>
          <Button
            secondary
            disabled={busy}
            label={`${f.file_name} belgesini indir`}
            onPress={() => {
              setError("");
              void db()
                .storage.from("post-evidence")
                .createSignedUrl(f.storage_path, 60, { download: f.file_name })
                .then(async (r) => {
                  if (r.error) throw r.error;
                  await Linking.openURL(r.data.signedUrl);
                })
                .catch(() =>
                  setError("Belge indirme bağlantısı oluşturulamadı."),
                );
            }}
          />
          {own && !verified && (
            <Button
              secondary
              disabled={busy}
              label={`${f.file_name} belgesini kaldır`}
              onPress={() => {
                setBusy(true);
                void Promise.resolve(
                  db().rpc("remove_post_evidence", { target: f.id }),
                )
                  .then(async (r) => {
                    if (r.error) throw r.error;
                    await db()
                      .storage.from("post-evidence")
                      .remove([f.storage_path]);
                    invalidate();
                  })
                  .catch(() => setError("Belge kaldırılamadı."))
                  .finally(() => setBusy(false));
              }}
            />
          )}
        </View>
      ))}
      {verification.data?.status === "pending" && (
        <Text style={styles.pillText}>Belge incelemesi bekliyor</Text>
      )}
      {verification.data?.status === "declined" && (
        <Text style={styles.muted}>
          Belgeler doğrulama için yeterli bulunmadı. Bu karar paylaşımın yayın
          durumunu değiştirmez.
        </Text>
      )}
      {own && !verified && !q.isPending && !q.isError && (
        <>
          <EvidenceUpload
            files={files}
            onChange={setFiles}
            disabled={busy}
            existing={q.data?.length ?? 0}
          />
          {files.length > 0 && (
            <Button
              disabled={busy}
              label="Belgeleri incelemeye gönder"
              onPress={() => {
                setBusy(true);
                setError("");
                setNotice("");
                void (async () => {
                  for (const f of files) {
                    await uploadEvidence(f, session!.user.id, post.id);
                    setFiles((current) =>
                      current.filter((x) => x.uri !== f.uri),
                    );
                  }
                  invalidate();
                  setNotice("Belgelerin inceleme kuyruğuna gönderildi.");
                })()
                  .catch(() => {
                    setError(
                      "Bazı belgeler yüklenemedi. Kalanları yeniden gönderebilirsin.",
                    );
                    invalidate();
                  })
                  .finally(() => setBusy(false));
              }}
            />
          )}
        </>
      )}
      {staff && !own && !!q.data?.length && (
        <>
          <Text style={styles.muted}>
            Tarihleri, ilgili belge alanını ve iddianın belgeyle desteklenip
            desteklenmediğini kontrol et. Yalnız poliçe veya bilet görmek, ıslak
            imza istendiği iddiasını tek başına doğrulamayabilir.
          </Text>
          {!verified && (
            <Button
              label="Belgeleri yeterli buldum · Doğrula"
              disabled={busy || post.status !== "approved"}
              onPress={() => setDecision("verified")}
            />
          )}
          {post.status !== "approved" && (
            <Text style={styles.muted}>
              Doğrulamadan önce paylaşımın yayın kararını ver.
            </Text>
          )}
          <Button
            secondary
            disabled={busy}
            label={
              verified
                ? "Belge doğrulamasını geri al"
                : "Belgeler doğrulama için yetersiz"
            }
            onPress={() => setDecision("declined")}
          />
        </>
      )}
      <TipPlacementEditor post={post} />
      <Message text={error} />
      <Sheet
        title="Belge inceleme kararı"
        visible={!!decision}
        onClose={() => setDecision(null)}
      >
        <Text style={styles.text}>
          {decision === "verified"
            ? "Bu karar destekleyici belgelerin incelendiğini belirtir; resmî gereklilik onayı değildir. +10 ek puan yalnız bir kez verilir."
            : "Doğrulama etiketi ve varsa +10 ek puan kaldırılır. Paylaşım yayında kalabilir."}
        </Text>
        <Field
          label="Özel belge inceleme notu"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={2000}
        />
        <Button
          label="Belge kararını kaydet"
          disabled={busy}
          onPress={() => {
            if (!decision) return;
            setBusy(true);
            void Promise.resolve(
              db().rpc("review_post_evidence", {
                target: post.id,
                decision,
                internal_note: note,
              }),
            )
              .then((r) => {
                if (r.error) throw r.error;
                setDecision(null);
                setNote("");
                invalidate();
              })
              .catch(() => setError("Belge kararı kaydedilemedi."))
              .finally(() => setBusy(false));
          }}
        />
      </Sheet>
    </View>
  );
}
function EvidenceQueueItem({ id }: { id: string }) {
  useAppearance();

  const post = useQuery({
    queryKey: ["evidence-review-post", id],
    queryFn: async () => {
      const r = await db().from("feed").select("*").eq("id", id).single();
      if (r.error) throw r.error;
      return r.data as Post;
    },
  });
  return post.data ? (
    <View style={{ gap: 10 }}>
      <Text style={styles.heading}>{post.data.title}</Text>
      <EvidencePanel post={post.data} />
    </View>
  ) : (
    <Text style={styles.muted}>
      {post.isError ? "Paylaşım yüklenemedi." : "Paylaşım yükleniyor…"}
    </Text>
  );
}
export function EvidenceQueue() {
  useAppearance();
  const { session, profile } = useAuth();
  const focused = useIsFocused();
  const staff = !!profile && profile.role !== "user";
  const q = useInfiniteQuery({
    queryKey: ["evidence-queue", session?.user.id],
    enabled: staff && focused,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let query = db()
        .from("post_verifications")
        .select("post_id")
        .eq("status", "pending")
        .order("post_id")
        .limit(50);
      if (pageParam) query = query.gt("post_id", pageParam);
      const r = await query;
      if (r.error) throw r.error;
      return r.data as { post_id: string }[];
    },
    getNextPageParam: (last) =>
      last.length === 50 ? last[last.length - 1].post_id : undefined,
    refetchInterval: focused ? 10000 : false,
    refetchIntervalInBackground: false,
  });
  const { refetch } = q;
  useFocusEffect(
    useCallback(() => {
      if (staff) void refetch();
    }, [staff, refetch]),
  );
  const items = [
    ...new Map(
      (q.data?.pages.flat() ?? []).map((item) => [item.post_id, item]),
    ).values(),
  ];
  if (!staff) return null;
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text style={[styles.heading, { flex: 1 }]}>
          Belge doğrulama kuyruğu
        </Text>
        <Button
          secondary
          label="Kuyruğu yenile"
          disabled={q.isFetching}
          onPress={() => void refetch()}
        />
      </View>
      {items.map((x) => (
        <EvidenceQueueItem key={x.post_id} id={x.post_id} />
      ))}
      {q.isError && (
        <Text style={styles.muted}>
          Belge kuyruğu yüklenemedi. Yeniden dene.
        </Text>
      )}
      {!items.length && !q.isError && (
        <Text style={styles.muted}>
          {q.isPending
            ? "Belgeler yükleniyor…"
            : "İnceleme bekleyen belge yok."}
        </Text>
      )}
      {q.hasNextPage && (
        <Button
          secondary
          label={
            q.isFetchingNextPage ? "Yükleniyor…" : "Diğer belgeleri göster"
          }
          disabled={q.isFetching}
          onPress={() => void q.fetchNextPage()}
        />
      )}
    </View>
  );
}
