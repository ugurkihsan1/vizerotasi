import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { usePost } from "../lib/data";
import { useAppearance } from "../lib/appearance";
import { styles, Sheet } from "./ui";
export function ChatPhoto({ path }: { path: string }) {
  useAppearance();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["chat", "photo", session?.user.id, path],
    enabled: !!session,
    queryFn: async () => {
      const r = await db().storage.from("chat-media").createSignedUrl(path, 60);
      if (r.error) throw r.error;
      return r.data.signedUrl;
    },
    staleTime: 45000,
    refetchInterval: 45000,
    retry: false,
  });
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fotoğrafı aç"
        onPress={() => q.data && setOpen(true)}
      >
        {q.data ? (
          <Image
            source={q.data}
            accessibilityLabel="Sohbet fotoğrafı"
            cachePolicy="none"
            contentFit="contain"
            style={{ width: 220, height: 220, borderRadius: 12 }}
          />
        ) : (
          <Text style={styles.muted}>
            {q.isError ? "Fotoğraf açılamadı" : "Fotoğraf yükleniyor…"}
          </Text>
        )}
      </Pressable>
      <Sheet visible={open} title="Fotoğraf" onClose={() => setOpen(false)}>
        {q.data && (
          <Image
            source={q.data}
            cachePolicy="none"
            contentFit="contain"
            style={{ width: "100%", height: 420 }}
          />
        )}
      </Sheet>
    </View>
  );
}
export function ChatSharedPost({ id }: { id: string }) {
  useAppearance();
  const q = usePost(id);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Gönderilen paylaşımı aç"
      onPress={() => {
        if (q.data)
          router.push(
            `/${q.data.kind === "experience" ? "experience" : q.data.kind === "question" ? "question" : "tip"}/${id}`,
          );
      }}
      style={[styles.card, { padding: 12, maxWidth: 260, gap: 5 }]}
    >
      <Text style={styles.muted}>Paylaşım</Text>
      <Text style={styles.pillText} numberOfLines={2}>
        {q.data?.title ??
          (q.isPending ? "Yükleniyor…" : "Bu paylaşım artık görünmüyor.")}
      </Text>
      {q.data && (
        <Text style={styles.text} numberOfLines={2}>
          {q.data.body}
        </Text>
      )}
    </Pressable>
  );
}
