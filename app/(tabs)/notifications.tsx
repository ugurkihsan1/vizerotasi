import type { Notice } from "../../src/lib/types";
import { useAppearance, themeColor, isDark } from "../../src/lib/appearance";
import { formatDateTime } from "../../src/lib/dates";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Text, Pressable, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { useNotifications, usePost, useProfile } from "../../src/lib/data";
import { useAuth } from "../../src/lib/auth";
import { db } from "../../src/lib/supabase";
import {
  styles,
  colors,
  Empty,
  ErrorState,
  Message,
} from "../../src/components/ui";
import { postPath } from "../../src/components/PostCard";
function NotificationRow({ n, onOpen }: { n: Notice; onOpen: () => void }) {
  useAppearance();

  const post = usePost(n.post_id ?? "");
  const follow = n.kind === "follow" || /seni takip/i.test(n.message);
  const actor = useProfile(follow ? (n.actor_id ?? undefined) : undefined);
  const reply = /yanıt/i.test(n.message);
  const badge = /rozet|seviye/i.test(n.message);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={n.message}
      onPress={() => {
        onOpen();
        if (follow && n.actor_id) {
          if (actor.data) router.push(`/profile/${actor.data.username}`);
          else
            void actor.refetch().then((result) => {
              if (result.data) router.push(`/profile/${result.data.username}`);
            });
        } else if (post.data) router.push(postPath(post.data));
      }}
      style={[
        styles.card,
        {
          flexDirection: "row",
          gap: 12,
          padding: 16,
          borderRadius: 18,
          borderLeftWidth: !n.read_at ? 3 : 1,
          borderLeftColor: !n.read_at
            ? colors.blue
            : themeColor("#E0E6E3", "border"),
          backgroundColor: !n.read_at
            ? themeColor("#EAF6F1", "surface")
            : themeColor("#FFFFFF", "surface"),
        },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={
            follow
              ? "person-add-outline"
              : reply
                ? "chatbubble-ellipses-outline"
                : badge
                  ? "ribbon-outline"
                  : "notifications-outline"
          }
          size={21}
          color={colors.blue}
        />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={[
            styles.text,
            { fontWeight: !n.read_at ? "700" : "500", lineHeight: 21 },
          ]}
        >
          {n.message}
        </Text>
        <Text style={[styles.muted, { fontSize: 11 }]}>
          {formatDateTime(n.created_at)}
        </Text>
      </View>
      {!n.read_at && (
        <View
          accessibilityLabel="Okunmamış"
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            marginTop: 7,
            backgroundColor: colors.blue,
          }}
        />
      )}
    </Pressable>
  );
}
export default function Notifications() {
  useAppearance();

  const { session } = useAuth();
  const q = useNotifications();
  const { refetch } = q;
  useFocusEffect(
    useCallback(() => {
      if (session) void refetch();
    }, [refetch, session]),
  );
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Tümü");
  const unread = (q.data ?? []).filter((n) => !n.read_at).length;
  const notices = (q.data ?? []).filter((n) =>
    filter === "Okunmamış"
      ? !n.read_at
      : filter === "Yanıtlar"
        ? /yanıt/i.test(n.message)
        : true,
  );
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Bildirimler"
          body="Bildirimlerini görmek için giriş yap."
          action="Giriş yap"
          onPress={() => router.push("/auth")}
        />
      </View>
    );
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={notices}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <View style={{ gap: 7, paddingBottom: 10 }}>
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", marginBottom: 10 },
            ]}
          >
            <Text style={styles.heading}>
              Bildirimlerin {unread ? `· ${unread}` : ""}
            </Text>
            {!!unread && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void db()
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("user_id", session.user.id)
                    .is("read_at", null)
                    .then((r) => {
                      if (r.error) setError("Bildirimler güncellenemedi.");
                      else
                        void cache.invalidateQueries({
                          queryKey: ["notifications"],
                        });
                    });
                }}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ color: colors.blue, fontWeight: "600" }}>
                  Tümünü oku
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.row}>
            {["Tümü", "Yanıtlar", "Okunmamış"].map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === value }}
                onPress={() => setFilter(value)}
                style={{
                  paddingHorizontal: 15,
                  minHeight: 40,
                  justifyContent: "center",
                  borderRadius: 20,
                  backgroundColor:
                    filter === value
                      ? colors.blue
                      : themeColor("#FFFFFF", "surface"),
                }}
              >
                <Text
                  style={{
                    color:
                      filter === value
                        ? isDark()
                          ? colors.bg
                          : "#FFFFFF"
                        : colors.text,
                    fontWeight: "600",
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
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
          <Empty title="Bildirim yok" />
        )
      }
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
    />
  );
}
