import { useInfiniteQuery } from "@tanstack/react-query";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { db, configured } from "../lib/supabase";
import { guideTopicLabels } from "../lib/guide-topics";
import { CriticalNotice } from "./CriticalNotice";
import { styles, colors, Button } from "./ui";

interface GuideTip {
  id: string;
  title: string;
  body: string;
  category_id: string;
}
const PAGE_SIZE = 5;
export function CommunityTips({
  country,
  categories,
}: {
  country: string;
  categories: string[];
}) {
  const topics = [...categories].sort();
  const query = useInfiniteQuery({
    queryKey: ["guide-community-tips", country, topics],
    enabled: configured && topics.length > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db()
        .from("posts")
        .select("id,title,body,category_id")
        .eq("country_id", country)
        .eq("kind", "tip")
        .eq("status", "approved")
        .eq("is_sample", false)
        .in("category_id", topics)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (r.error) throw r.error;
      return r.data as GuideTip[];
    },
    getNextPageParam: (last, pages) =>
      last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const tips = query.data?.pages.flat() ?? [];
  if (!topics.length) return null;
  return (
    <View style={{ gap: 9 }}>
      {tips.map((tip) => (
        <CriticalNotice
          key={tip.id}
          title={tip.title}
          source="community"
          topic={guideTopicLabels[tip.category_id] ?? tip.category_id}
        >
          <Text style={styles.text}>{tip.body}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${tip.title}: paylaşımı ve yorumları aç`}
            onPress={() => router.push(`/experience/${tip.id}`)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: colors.blue, fontSize: 12 }}>
              Paylaşımı ve yorumları gör →
            </Text>
          </Pressable>
        </CriticalNotice>
      ))}
      {query.hasNextPage && (
        <Button
          secondary
          disabled={query.isFetchingNextPage}
          label={
            query.isFetchingNextPage
              ? "Notlar yükleniyor…"
              : "Daha fazla topluluk notu"
          }
          onPress={() => void query.fetchNextPage()}
        />
      )}
      {query.isError && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={styles.muted}>
            Topluluk notları yüklenemedi. Yeniden dene.
          </Text>
        </Pressable>
      )}
    </View>
  );
}
