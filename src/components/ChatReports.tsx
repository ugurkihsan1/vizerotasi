import { useState } from "react";
import { Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../lib/supabase";
import { chatError } from "../lib/chat";
import { formatDateTime } from "../lib/dates";
import { Button, Message, Sheet, styles } from "./ui";
export function ChatReports() {
  const cache = useQueryClient(),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<{
      id: string;
      hide: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["chat", "reports"],
    enabled: open,
    queryFn: async () => {
      const r = await db()
        .from("chat_reports")
        .select("id,body_snapshot,reason,created_at")
        .is("resolved_at", null)
        .order("created_at")
        .limit(30);
      if (r.error) throw r.error;
      return r.data as {
        id: string;
        body_snapshot: string;
        reason: string;
        created_at: string;
      }[];
    },
  });
  return (
    <View>
      <Button
        secondary
        label="Bildirilen sohbet mesajlarını incele"
        onPress={() => setOpen(true)}
      />
      <Sheet
        title="Bildirilen sohbet mesajları"
        visible={open}
        onClose={() => setOpen(false)}
      >
        <Text style={styles.muted}>
          Burada yalnız bildirilen mesajın kopyası görünür; özel sohbetin
          tamamına erişim verilmez.
        </Text>
        {q.isError && <Message text={chatError(q.error)} />}{" "}
        {q.data?.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.text}>{r.body_snapshot}</Text>
            <Text style={styles.muted}>
              {r.reason} · {formatDateTime(r.created_at)}
            </Text>
            <Button
              secondary
              label="İncelendi · Mesaj kalsın"
              onPress={() => setSelected({ id: r.id, hide: false })}
            />
            <Button
              label="Mesajı kaldır ve bildirimi kapat"
              onPress={() => setSelected({ id: r.id, hide: true })}
            />
          </View>
        ))}
        {q.isSuccess && !q.data.length && (
          <Text style={styles.muted}>Bekleyen sohbet bildirimi yok.</Text>
        )}
        <Message text={error} />
        {selected && (
          <View style={styles.card}>
            <Text style={styles.text}>
              {selected.hide
                ? "Mesaj tüm katılımcılar için kaldırılacak."
                : "Bildirim incelendi olarak kapatılacak."}
            </Text>
            <Button
              label="Sohbet bildirim kararını kaydet"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void Promise.resolve(
                  db().rpc("chat_review_report", {
                    target: selected.id,
                    hide_message: selected.hide,
                  }),
                )
                  .then((r) => {
                    if (r.error) throw r.error;
                    setSelected(null);
                    void cache.invalidateQueries({ queryKey: ["chat"] });
                  })
                  .catch((e) => setError(chatError(e)))
                  .finally(() => setBusy(false));
              }}
            />
          </View>
        )}
      </Sheet>
    </View>
  );
}
