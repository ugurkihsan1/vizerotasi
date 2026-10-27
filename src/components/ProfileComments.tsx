import { useAppearance } from "../lib/appearance";
import { formatDate } from "../lib/dates";
import { useInfiniteQuery } from "@tanstack/react-query";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { db } from "../lib/supabase";
import type { Comment } from "../lib/types";
import { Button, Empty, styles } from "./ui";
import { statusLabels } from "./PostCard";
export function ProfileComments({ user }: { user: string }) {
  useAppearance();

  const q = useInfiniteQuery({
    queryKey: ["profile-comments", user],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db()
        .from("comments")
        .select("*")
        .eq("user_id", user)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 14);
      if (r.error) throw r.error;
      return r.data as Comment[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 15 ? pages.length * 15 : undefined,
  });
  return (
    <View style={{ gap: 12 }}>
      {q.data?.pages.flat().map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.text}>{c.body}</Text>
          <Text style={styles.muted}>
            {statusLabels[c.status]} · {formatDate(c.created_at)}
          </Text>
          <Button
            secondary
            label="Konuşmaya git"
            onPress={() => router.push(`/experience/${c.post_id}`)}
          />
        </View>
      ))}
      {!q.data?.pages[0].length && (
        <Empty title={q.isError ? "Yorumlar yüklenemedi" : "Henüz yorum yok"} />
      )}
      {q.hasNextPage && (
        <Button
          secondary
          label="Daha fazla yorum"
          disabled={q.isFetchingNextPage}
          onPress={() => void q.fetchNextPage()}
        />
      )}
    </View>
  );
}
