import { useQuery } from "@tanstack/react-query";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { db } from "../lib/supabase";
import { Button, styles } from "./ui";
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
  const q = useQuery({
    queryKey: ["reported-content", report.id],
    queryFn: async () => {
      if (report.post_id) {
        const r = await db()
          .from("posts")
          .select("id,title,body")
          .eq("id", report.post_id)
          .single();
        if (r.error) throw r.error;
        return { post: report.post_id, title: r.data.title, body: r.data.body };
      }
      const r = await db()
        .from("comments")
        .select("post_id,body")
        .eq("id", report.comment_id!)
        .single();
      if (r.error) throw r.error;
      return {
        post: r.data.post_id,
        title: "Bildirilen yorum",
        body: r.data.body,
      };
    },
  });
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{report.reason}</Text>
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
      <Button label="Çözüldü olarak işaretle" onPress={resolve} />
    </View>
  );
}
