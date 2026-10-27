import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { db } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Button, styles, Sheet, Field, Message, colors } from "./ui";
interface ReportItem {
  id: string;
  reason: string;
  post_id: string | null;
  comment_id: string | null;
}
export function ModerationReport({
  report,
  resolve,
}: {
  report: ReportItem;
  resolve: () => void;
}) {
  useAppearance();

  const { profile } = useAuth();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deduction, setDeduction] = useState("25");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["reported-content", report.id],
    queryFn: async () => {
      if (report.post_id) {
        const r = await db()
          .from("posts")
          .select("id,title,body,user_id")
          .eq("id", report.post_id)
          .single();
        if (r.error) throw r.error;
        return {
          post: report.post_id,
          user: r.data.user_id,
          title: r.data.title,
          body: r.data.body,
        };
      }
      const r = await db()
        .from("comments")
        .select("post_id,body,user_id")
        .eq("id", report.comment_id!)
        .single();
      if (r.error) throw r.error;
      return {
        post: r.data.post_id,
        user: r.data.user_id,
        title: "Bildirilen yorum",
        body: r.data.body,
      };
    },
  });
  const alerts = useQuery({
    queryKey: ["member-feedback-alerts"],
    queryFn: async () => {
      const r = await db().from("member_feedback_queue").select("*");
      if (r.error) return [];
      return r.data as { user_id: string; reporters: number }[];
    },
    staleTime: 30000,
  });
  const alert = alerts.data?.find((a) => a.user_id === q.data?.user);
  async function confirm() {
    const amount = Number(deduction);
    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 2000 ||
      note.trim().length < 5
    ) {
      setMessage("1–2000 arasında puan ve en az 5 karakter gerekçe gir.");
      return;
    }
    setBusy(true);
    const r = await db().rpc("review_member_report", {
      target_report: report.id,
      confirmed: true,
      deduction: amount,
      moderator_note: note.trim(),
    });
    setBusy(false);
    if (r.error) {
      setMessage(
        "İnceleme kaydedilemedi. Topluluk güncellemesini ve yetkini kontrol et.",
      );
      return;
    }
    setOpen(false);
    void cache.invalidateQueries({ queryKey: ["moderation"] });
    void cache.invalidateQueries({ queryKey: ["member-feedback-alerts"] });
    void cache.invalidateQueries({ queryKey: ["profile"] });
    void cache.invalidateQueries({ queryKey: ["public-profile"] });
  }
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{report.reason}</Text>
      {alert && (
        <View
          style={{
            padding: 12,
            backgroundColor: themeColor("#FFF0D4", "surface"),
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: textSize(12),
              color: themeColor("#966D28", "text"),
            }}
          >
            {alert.reporters} farklı üyeden bildirim var. İnceleme gerekiyor;
            otomatik puan kesilmedi.
          </Text>
        </View>
      )}
      <Text style={styles.pillText}>
        {q.data?.title ?? "İçerik yükleniyor"}
      </Text>
      <Text style={styles.text}>
        {q.data?.body ?? (q.isError ? "İçerik yüklenemedi." : "")}
      </Text>
      {q.data && (
        <Button
          secondary
          label="Konuşmayı aç"
          onPress={() => router.push(`/experience/${q.data!.post}`)}
        />
      )}
      <Button secondary label="İhlal yok / çözüldü" onPress={resolve} />
      {profile?.role === "admin" && (
        <Button
          label="İhlali doğrula ve puan düşür"
          onPress={() => setOpen(true)}
        />
      )}
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="İnceleme kararını onayla"
      >
        <Text style={styles.text}>
          İhlali doğruladığında gönderi sahibinin rozet puanı düşer ve seviyesi
          yeniden hesaplanır. Aynı içerik için tekrar kesinti yapılmaz.
        </Text>
        <Field
          label="Düşürülecek rozet puanı (1–2000)"
          value={deduction}
          onChangeText={setDeduction}
          keyboardType="number-pad"
        />
        <Field
          label="İç inceleme gerekçesi (üye ve diğer kullanıcılara gösterilmez)"
          value={note}
          onChangeText={setNote}
          multiline
        />
        <Message text={message} />
        <Text style={[styles.muted, { color: colors.red }]}>
          Bildirim sayısı tek başına ihlal kanıtı değildir.
        </Text>
        <Button
          label="Kararı ve kesintiyi kaydet"
          disabled={busy}
          onPress={() => void confirm()}
        />
      </Sheet>
    </View>
  );
}
