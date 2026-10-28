import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { useSocialProfile, useFollowAction } from "../lib/social";
import { useAppearance } from "../lib/appearance";
import { Button, Sheet, Message, styles, useGate } from "./ui";
import { Avatar } from "./PostCard";
export function ProfileConnections({ id, own }: { id: string; own: boolean }) {
  useAppearance();
  const { session } = useAuth(),
    q = useSocialProfile(id),
    act = useFollowAction(),
    gate = useGate();
  const [open, setOpen] = useState<
      "followers" | "following" | "requests" | null
    >(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const list = useInfiniteQuery({
    queryKey: ["social-list", session?.user.id, id, open],
    enabled: !!open && !!session,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const following = open === "following";
      const r = await db()
        .from("user_follows")
        .select(
          following
            ? "follower_id,following_id,profiles!user_follows_following_id_fkey(id,username,display_name,avatar_url)"
            : "follower_id,following_id,profiles!user_follows_follower_id_fkey(id,username,display_name,avatar_url)",
        )
        .eq(following ? "follower_id" : "following_id", id)
        .eq("status", open === "requests" ? "pending" : "accepted")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 29);
      if (r.error) throw r.error;
      return r.data as unknown as {
        follower_id: string;
        following_id: string;
        profiles: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        };
      }[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 30 ? pages.length * 30 : undefined,
  });
  async function action(target: string, mode: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await act(target, mode);
      void list.refetch();
    } catch {
      setError("İşlem tamamlanamadı. Sosyal profil güncellemesini kontrol et.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        {(["followers", "following"] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={
              key === "followers" ? "Takipçiler" : "Takip edilenler"
            }
            onPress={() => gate.require(() => setOpen(key))}
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingRight: 14,
            }}
          >
            <Text style={styles.pillText}>
              {q.data?.[key] ?? "—"} {key === "followers" ? "takipçi" : "takip"}
            </Text>
          </Pressable>
        ))}
        {own && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Takip istekleri"
            onPress={() => setOpen("requests")}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={styles.muted}>İstekler</Text>
          </Pressable>
        )}
      </View>
      {!own && session?.user.id !== id && (
        <Button
          disabled={busy}
          secondary={!!q.data?.relationship}
          label={
            q.data?.relationship === "accepted"
              ? "Takiptesin"
              : q.data?.relationship === "pending"
                ? "İstek gönderildi"
                : "Takip et"
          }
          onPress={() =>
            gate.require(
              () =>
                void action(id, q.data?.relationship ? "unfollow" : "follow"),
            )
          }
        />
      )}
      <Message text={error} />
      {gate.view}
      <Sheet
        visible={!!open}
        title={
          open === "requests"
            ? "Takip istekleri"
            : open === "following"
              ? "Takip edilenler"
              : "Takipçiler"
        }
        onClose={() => setOpen(null)}
      >
        {list.isError && (
          <Text style={styles.muted}>
            Liste yüklenemedi. Sosyal profil güncellemesini kontrol et.
          </Text>
        )}
        {list.data?.pages.flat().map((row) => (
          <View
            key={row.follower_id + row.following_id}
            style={[styles.row, { flexWrap: "nowrap" }]}
          >
            <Pressable
              style={[styles.row, { flex: 1 }]}
              accessibilityRole="link"
              onPress={() => {
                setOpen(null);
                router.push(`/profile/${row.profiles.username}`);
              }}
            >
              <Avatar
                size={32}
                name={row.profiles.display_name}
                url={row.profiles.avatar_url}
              />
              <Text style={styles.text}>{row.profiles.username}</Text>
            </Pressable>
            {open === "requests" && (
              <>
                <Button
                  label="Kabul et"
                  disabled={busy}
                  onPress={() => void action(row.follower_id, "accept")}
                />
                <Button
                  secondary
                  label="Reddet"
                  disabled={busy}
                  onPress={() => void action(row.follower_id, "reject")}
                />
              </>
            )}
            {own && open === "followers" && (
              <Button
                secondary
                disabled={busy}
                label="Kaldır"
                onPress={() => void action(row.follower_id, "remove")}
              />
            )}
          </View>
        ))}
        {list.hasNextPage && (
          <Button
            secondary
            disabled={list.isFetchingNextPage}
            label="Daha fazla kişi"
            onPress={() => void list.fetchNextPage()}
          />
        )}
        {!list.isPending &&
          !list.isError &&
          !list.data?.pages.flat().length && (
            <Text style={styles.muted}>Henüz kimse yok.</Text>
          )}
      </Sheet>
    </View>
  );
}
