import { useAppearance } from "../src/lib/appearance";
import { ChatReports } from "../src/components/ChatReports";
import { EvidencePanel, EvidenceQueue } from "../src/components/EvidencePanel";
import { router } from "expo-router";
import { ModerationReport } from "../src/components/ModerationReport";
import { useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../src/lib/supabase";
import { useAuth } from "../src/lib/auth";
import {
  styles,
  Button,
  Chip,
  Sheet,
  Field,
  Message,
  Empty,
  Busy,
} from "../src/components/ui";
import { PostCard } from "../src/components/PostCard";
import type { Post, Comment, Status } from "../src/lib/types";
export default function Moderation() {
  useAppearance();

  const { profile } = useAuth();
  const [tab, setTab] = useState("all");
  const [target, setTarget] = useState<{ id: string; decision: Status } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  const staff = profile && profile.role !== "user";
  const q = useQuery({
    queryKey: ["moderation", tab],
    enabled: !!staff,
    queryFn: async () => {
      const r =
        tab === "comment"
          ? await db()
              .from("comments")
              .select("*")
              .eq("status", "pending")
              .order("created_at")
              .limit(50)
          : tab === "reports"
            ? await db()
                .from("reports")
                .select("*")
                .is("resolved_at", null)
                .order("created_at")
                .limit(50)
            : await db()
                .from("feed")
                .select("*")
                .eq("status", "pending")
                .in(
                  "kind",
                  tab === "all"
                    ? ["experience", "question", "tip", "update"]
                    : [tab],
                )
                .order("created_at")
                .limit(50);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  async function decide() {
    if (!target) return;
    setBusy(true);
    const r = await db().rpc("moderate", {
      target: target.id,
      decision: target.decision,
      is_comment: tab === "comment",
      internal_note: note,
    });
    setBusy(false);
    if (r.error)
      setError("Karar kaydedilemedi. Yetkini ve bağlantını kontrol et.");
    else {
      setTarget(null);
      setNote("");
      void cache.invalidateQueries();
    }
  }
  if (!staff) return <Empty title="Bu alan moderasyon ekibine özel" />;
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={q.data ?? []}
      keyExtractor={(x) => x.id}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Text style={styles.title}>Birlikte güvenli bir topluluk.</Text>
          <View style={styles.row}>
            {Object.entries({
              all: "Tüm gönderiler",
              experience: "Deneyimler",
              question: "Sorular",
              tip: "Önemli",
              comment: "Yorumlar",
              reports: "Bildirilenler",
            }).map(([k, l]) => (
              <Chip
                key={k}
                label={l}
                active={tab === k}
                onPress={() => setTab(k)}
              />
            ))}
          </View>
          <Button
            secondary
            label="Belge notlarını incele"
            onPress={() => router.push("/document-notes")}
          />
          <ChatReports />
          <EvidenceQueue />
          <Message text={error} />
        </View>
      }
      renderItem={({ item }) =>
        tab === "reports" ? (
          <ModerationReport
            report={
              item as {
                id: string;
                reason: string;
                post_id: string | null;
                comment_id: string | null;
              }
            }
            resolve={() => {
              void db()
                .from("reports")
                .update({ resolved_at: new Date().toISOString() })
                .eq("id", item.id)
                .then((r) => {
                  if (r.error) setError("Bildirim güncellenemedi.");
                  else void q.refetch();
                });
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {tab === "comment" ? (
              <View style={styles.card}>
                <Text style={styles.text}>{(item as Comment).body}</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <PostCard post={item as Post} detail />
                <EvidencePanel post={item as Post} />
              </View>
            )}
            <View style={styles.row}>
              {(["approved", "needs_revision", "rejected"] as const).map(
                (d) => (
                  <Button
                    key={d}
                    label={
                      {
                        approved: "Yayına al",
                        needs_revision: "Revizyon",
                        rejected: "Reddet",
                      }[d]
                    }
                    secondary={d !== "approved"}
                    disabled={
                      item.user_id === profile?.id && profile?.role !== "admin"
                    }
                    onPress={() => {
                      setError("");
                      setTarget({ id: item.id, decision: d });
                    }}
                  />
                ),
              )}
            </View>
          </View>
        )
      }
      ListEmptyComponent={
        q.isPending ? (
          <Busy />
        ) : (
          <Empty
            title={q.isError ? "Kuyruk yüklenemedi" : "Bekleyen paylaşım yok"}
          />
        )
      }
      ListFooterComponent={
        <Sheet
          title="Yayın kararını onayla"
          visible={!!target}
          onClose={() => setTarget(null)}
        >
          <Text style={styles.text}>
            Bu karar içerik görünürlüğünü değiştirecek. Onayda katkı puanı
            sunucu tarafından bir kez verilir.
          </Text>
          <Field
            label="İç moderasyon notu (kullanıcıya görünmez)"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <Message text={error} />
          <Button
            label="Kararı kaydet"
            disabled={busy}
            onPress={() => void decide()}
          />
        </Sheet>
      }
    />
  );
}
