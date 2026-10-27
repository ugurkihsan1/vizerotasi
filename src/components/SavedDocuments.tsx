import { useAppearance } from "../lib/appearance";
import { useState } from "react";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { styles, Button, Empty, Message } from "./ui";
import type { Document } from "../lib/types";
export function SavedDocuments() {
  useAppearance();

  const { session } = useAuth();
  const [message, setMessage] = useState("");
  const q = useQuery({
    queryKey: ["saved-documents", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const r = await db()
        .from("saved_items")
        .select("id,country_documents(*)")
        .eq("user_id", session!.user.id)
        .not("document_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  return (
    <View style={{ gap: 12 }}>
      <Message text={message} />
      {q.data?.map((x) => {
        const doc = x.country_documents as unknown as Document;
        return (
          <View key={x.id} style={styles.card}>
            <Text style={styles.heading}>{doc.title}</Text>
            <Text style={styles.text}>{doc.body}</Text>
            <Button
              secondary
              label="Kaydı kaldır"
              onPress={() => {
                void db()
                  .from("saved_items")
                  .delete()
                  .eq("id", x.id)
                  .then((r) => {
                    if (r.error) setMessage("Kayıt kaldırılamadı.");
                    else void q.refetch();
                  });
              }}
            />
          </View>
        );
      })}
      {!q.data?.length && (
        <Empty
          title="Henüz belge kaydetmedin"
          body="Ülke sayfalarındaki belgeleri buraya kaydedebilirsin."
        />
      )}
    </View>
  );
}
