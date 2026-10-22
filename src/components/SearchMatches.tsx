import { useQuery } from "@tanstack/react-query";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { db, configured } from "../lib/supabase";
import { Button, styles, Empty, Sheet } from "./ui";
import { useState } from "react";
import type { Document, Profile } from "../lib/types";
export function SearchMatches({ search }: { search: string }) {
  const [selected, setSelected] = useState<Document | null>(null);
  const q = useQuery({
    queryKey: ["global-search", search],
    enabled: configured && search.length > 1,
    queryFn: async () => {
      const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      const [users, docs] = await Promise.all([
        db().from("profiles").select("*").ilike("username", pattern).limit(8),
        db()
          .from("country_documents")
          .select("*")
          .ilike("title", pattern)
          .limit(8),
      ]);
      if (users.error) throw users.error;
      if (docs.error) throw docs.error;
      return {
        users: users.data as Profile[],
        documents: docs.data as Document[],
      };
    },
  });
  if (search.length < 2) return null;
  return (
    <View style={{ gap: 12 }}>
      {q.data?.users.length ? (
        <>
          <Text style={styles.heading}>Topluluktan kişiler</Text>
          {q.data.users.map((p) => (
            <Button
              key={p.id}
              secondary
              label={`@${p.username} · ${p.membership_level}`}
              onPress={() => router.push(`/profile/${p.username}`)}
            />
          ))}
        </>
      ) : null}
      {q.data?.documents.length ? (
        <>
          <Text style={styles.heading}>Belgeler</Text>
          {q.data.documents.map((d) => (
            <Button
              key={d.id}
              secondary
              label={d.title}
              onPress={() => setSelected(d)}
            />
          ))}
        </>
      ) : null}
      {q.isError && <Empty title="Arama tamamlanamadı" />}
      <Sheet
        visible={!!selected}
        title={selected?.title ?? "Belge"}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.text}>{selected?.body}</Text>
        <Button
          label="Ülke topluluğuna git"
          onPress={() => {
            const id = selected?.country_id;
            setSelected(null);
            if (id) router.push(`/country/${id}`);
          }}
        />
      </Sheet>
    </View>
  );
}
