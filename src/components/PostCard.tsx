import { Ionicons } from "@expo/vector-icons";
import { processingDays } from "../lib/dates";
import { Text, View, Pressable, Share } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Post } from "../lib/types";
import {
  useCountries,
  useProfile,
  useToggle,
  friendlyError,
} from "../lib/data";
import { useAuth } from "../lib/auth";
import { Button, styles, colors, useGate, Message } from "./ui";
import { useState } from "react";
export const kindLabels = {
  experience: "Deneyim",
  question: "Soru",
  tip: "⚡ Kritik nokta",
  update: "Ülke güncellemesi",
};
export const resultLabels = {
  approved: "✓ Onaylandı",
  rejected: "✕ Reddedildi",
  waiting: "◷ Bekliyor",
};
export const statusLabels = {
  pending: "Onay bekliyor",
  approved: "Yayında",
  rejected: "Yayına alınmadı",
  needs_revision: "Düzenleme istendi",
};
export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return url ? (
    <Image
      source={url}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      cachePolicy="memory-disk"
      accessibilityLabel={name}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#DCE9FC",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontWeight: "800",
          color: colors.blue,
          fontSize: size > 50 ? 24 : 14,
        }}
      >
        {name.slice(0, 2).toLocaleUpperCase("tr-TR")}
      </Text>
    </View>
  );
}
export function postPath(post: Pick<Post, "kind" | "id">) {
  return `/${post.kind === "experience" ? "experience" : post.kind === "question" ? "question" : "tip"}/${post.id}` as "/experience/[id]";
}
export function Actions({ post }: { post: Post }) {
  const gate = useGate();
  const { session } = useAuth();
  const vote = useToggle("helpful_votes", "post_id", post.id);
  const save = useToggle("saved_items", "post_id", post.id);
  const [error, setError] = useState("");
  const act = async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
      void Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${post.helpful_count} Faydalı`}
          accessibilityState={{ selected: vote.active }}
          disabled={session?.user.id === post.user_id || vote.pending}
          onPress={() => gate.require(() => void act(vote.toggle))}
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons
            name={vote.active ? "heart" : "heart-outline"}
            size={21}
            color={vote.active ? colors.blue : colors.muted}
          />
          <Text style={styles.muted}>{post.helpful_count} Faydalı</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${post.comment_count} Yanıt`}
          onPress={() => router.push(postPath(post))}
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.muted} />
          <Text style={styles.muted}>{post.comment_count} Yanıt</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={save.active ? "Kaydı kaldır" : "Kaydet"}
          accessibilityState={{ selected: save.active }}
          disabled={save.pending}
          onPress={() => gate.require(() => void act(save.toggle))}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={save.active ? "bookmark" : "bookmark-outline"}
            size={21}
            color={save.active ? colors.blue : colors.muted}
          />
        </Pressable>
      </View>
      <Message text={error} />
      {gate.view}
    </View>
  );
}
export function ShareButton({ post }: { post: Post }) {
  return (
    <Button
      label="Paylaş"
      secondary
      onPress={() => {
        void Share.share({
          message: `${post.title} — Vize Rotası\nvizerotasi:/${postPath(post)}`,
        }).catch(() => {});
      }}
    />
  );
}
export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const { data: countries } = useCountries();
  const { data: author } = useProfile(post.user_id);
  const country = countries?.find((x) => x.id === post.country_id);
  const days = processingDays(post.application_date, post.decision_date);
  return (
    <View
      style={[
        styles.card,
        post.kind === "tip" && {
          backgroundColor: "#FFF9ED",
          borderColor: "#EEE1C5",
        },
        post.kind === "question" && { borderColor: "#DDE6E9" },
      ]}
    >
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/country/${post.country_id}`)}
        >
          <Text style={styles.pillText}>
            {country?.flag} {country?.name ?? "Ülke"}
          </Text>
        </Pressable>
        <Text
          style={[
            styles.muted,
            { color: post.kind === "tip" ? colors.amber : colors.blue },
          ]}
        >
          {kindLabels[post.kind]}
        </Text>
      </View>
      <Pressable
        style={styles.row}
        accessibilityRole="link"
        onPress={() => author && router.push(`/profile/${author.username}`)}
      >
        <Avatar name={author?.display_name ?? "Üye"} url={author?.avatar_url} />
        <View>
          <Text style={styles.pillText}>
            {author?.username ?? "Topluluk üyesi"}
          </Text>
          <Text style={styles.muted}>
            {author?.membership_level} ·{" "}
            {new Date(post.created_at).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
      </Pressable>
      {post.status !== "approved" && (
        <Text style={{ color: colors.amber }}>{statusLabels[post.status]}</Text>
      )}
      {post.is_sample && (
        <Text style={{ color: colors.amber }}>Örnek İçerik</Text>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => !detail && router.push(postPath(post))}
        style={{ gap: 12 }}
      >
        {post.result && (
          <View
            style={[
              styles.row,
              {
                padding: 14,
                borderRadius: 16,
                backgroundColor:
                  post.result === "approved"
                    ? "#EDF5EE"
                    : post.result === "rejected"
                      ? "#FCF0ED"
                      : "#FFF5DF",
                justifyContent: "space-between",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color:
                  post.result === "approved"
                    ? colors.green
                    : post.result === "rejected"
                      ? colors.red
                      : colors.amber,
              }}
            >
              {resultLabels[post.result]}
            </Text>
            <Text style={[styles.muted, { fontWeight: "600", fontSize: 12 }]}>
              {days === null
                ? "Süre: Belirtilmedi"
                : `${days} günde sonuçlandı`}
            </Text>
          </View>
        )}
        <Text style={styles.heading}>{post.title}</Text>
        {post.kind === "experience" && (
          <View style={styles.row}>
            {[
              post.first_schengen ? "İlk Schengen" : null,
              post.employment_status,
              post.city,
              post.financing,
            ]
              .filter(Boolean)
              .map((x) => (
                <View key={x} style={styles.pill}>
                  <Text style={styles.pillText}>{x}</Text>
                </View>
              ))}
          </View>
        )}
        {post.kind === "experience" && (
          <Text style={styles.muted}>
            İstenen: {post.requested_days ?? "—"} gün · Verilen:{" "}
            {post.granted_days ?? "—"} gün{" "}
            {post.entries &&
              `· ${{ single: "Tek giriş", double: "Çift giriş", multi: "Çok giriş" }[post.entries] ?? ""}`}
          </Text>
        )}
        <Text style={styles.text} numberOfLines={detail ? undefined : 4}>
          {post.body}
        </Text>
        {post.kind === "tip" && (
          <Text style={styles.muted}>
            {
              {
                submission: "Topluluk paylaşımı",
                official: "🏛 Resmî Kaynak",
                editorial: "✍ Editör Notu",
                community_verified: "✓ Topluluk Tarafından Doğrulandı",
              }[post.source_type]
            }
            {post.last_verified_at
              ? ` · ${new Date(post.last_verified_at).toLocaleDateString("tr-TR")}`
              : ""}
          </Text>
        )}
      </Pressable>
      {post.status === "approved" && <Actions post={post} />}
    </View>
  );
}
