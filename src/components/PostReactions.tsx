import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { db, configured } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Profile } from "../lib/types";
import { useAppearance } from "../lib/appearance";
import { Avatar } from "./Avatar";
import { Sheet, styles, colors, Busy, Empty, ErrorState, Button } from "./ui";

const PAGE_SIZE = 30;
type Reaction = {
  user_id: string;
  profiles: Pick<
    Profile,
    "id" | "username" | "display_name" | "avatar_url"
  > | null;
};

export function PostReactions({
  postId,
  count,
  compact = false,
}: {
  postId: string;
  count: number;
  compact?: boolean;
}) {
  useAppearance();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["post-reactions", postId, session?.user.id],
    enabled: configured && open,
    initialPageParam: 0,
    staleTime: 0,
    queryFn: async ({ pageParam }) => {
      const result = await db()
        .from("helpful_votes")
        .select("user_id,profiles(id,username,display_name,avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .order("user_id", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (result.error) throw result.error;
      return result.data as unknown as Reaction[];
    },
    getNextPageParam: (last, pages) =>
      last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });
  const people = [
    ...new Map(
      (query.data?.pages.flat() ?? [])
        .filter((reaction) => reaction.profiles)
        .map((reaction) => [reaction.user_id, reaction.profiles!]),
    ).values(),
  ];
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${count} kişi faydalı buldu. Listeyi aç`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 44,
          minWidth: compact ? 32 : undefined,
          justifyContent: "center",
        }}
      >
        <Text style={styles.muted}>{compact ? count : `${count} Faydalı`}</Text>
      </Pressable>
      <Sheet
        title="Faydalı bulanlar"
        visible={open}
        onClose={() => setOpen(false)}
      >
        {query.isPending ? (
          <Busy />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : !people.length ? (
          <Empty title="Henüz kimse faydalı olarak işaretlememiş" />
        ) : (
          <View style={{ gap: 4 }}>
            {people.map((person) => (
              <Pressable
                key={person.id}
                accessibilityRole="link"
                accessibilityLabel={`${person.username} profilini aç`}
                onPress={() => {
                  setOpen(false);
                  router.push(`/profile/${person.username}`);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 68,
                  paddingVertical: 8,
                }}
              >
                <Avatar
                  name={person.display_name}
                  url={person.avatar_url}
                  size={44}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: colors.navy,
                      fontWeight: "600",
                      fontSize: 15,
                    }}
                    numberOfLines={1}
                  >
                    {person.display_name}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    @{person.username}
                  </Text>
                </View>
              </Pressable>
            ))}
            {query.hasNextPage && (
              <Button
                secondary
                label={
                  query.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"
                }
                disabled={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              />
            )}
          </View>
        )}
      </Sheet>
    </>
  );
}
