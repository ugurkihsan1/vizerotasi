import { formatDateTime } from "../../src/lib/dates";
import { FlatList, Text, Pressable, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useNotifications, usePost } from "../../src/lib/data";
import { useAuth } from "../../src/lib/auth";
import { db } from "../../src/lib/supabase";
import { styles, Empty, ErrorState, Message } from "../../src/components/ui";
import { postPath } from "../../src/components/PostCard";
function NotificationRow({
  n,
  onOpen,
}: {
  n: {
    id: string;
    message: string;
    post_id: string | null;
    read_at: string | null;
    created_at: string;
  };
  onOpen: () => void;
}) {
  const post = usePost(n.post_id ?? "");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onOpen();
        if (post.data) router.push(postPath(post.data));
      }}
      style={[styles.card, !n.read_at && { backgroundColor: "#EAF1FF" }]}
    >
      <Text style={[styles.text, { fontWeight: "600" }]}>
        {!n.read_at ? "• " : ""}
        {n.message}
      </Text>
      <Text style={styles.muted}>{formatDateTime(n.created_at)}</Text>
    </Pressable>
  );
}
export default function Notifications() {
  const { session } = useAuth();
  const q = useNotifications();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Bildirimlerin burada"
          body="Topluluğa katıl, yanıtları ve gelişmeleri kaçırma."
          action="Giriş yap"
          onPress={() => router.push("/auth")}
        />
      </View>
    );
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={q.data ?? []}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <View style={{ gap: 7, paddingBottom: 10 }}>
          <Message text={error} />
        </View>
      }
      renderItem={({ item: n }) => (
        <NotificationRow
          n={n}
          onOpen={() => {
            void db()
              .from("notifications")
              .update({ read_at: new Date().toISOString() })
              .eq("id", n.id)
              .then((r) => {
                if (r.error) setError("Bildirim güncellenemedi.");
                else
                  void cache.invalidateQueries({ queryKey: ["notifications"] });
              });
          }}
        />
      )}
      ListEmptyComponent={
        q.isError ? (
          <ErrorState retry={() => void q.refetch()} />
        ) : (
          <Empty
            title="Şimdilik her şey sakin"
            body="Yanıtlar ve onaylar burada görünecek."
          />
        )
      }
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
    />
  );
}
