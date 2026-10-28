import { webPath } from "../lib/web-path";
import { SendPost } from "./SendPost";
import { DeleteContent } from "./DeleteContent";
import { themeColor, textSize, useAppearance, isDark } from "../lib/appearance";

import { PlaneReaction } from "./PlaneReaction";
import { VerificationLabel } from "./VerificationLabel";
import { Ionicons } from "@expo/vector-icons";
import { CountryFlag } from "./CountryFlag";
import { processingDays, formatDate } from "../lib/dates";
import { Text, View, Pressable, Share, Platform } from "react-native";
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
  experience: "Vize deneyimi",
  general: "Genel deneyim",
  question: "Soru",
  tip: "⚡ Önemli bilgi",
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
  accent,
}: {
  name: string;
  url?: string | null;
  size?: number;
  accent?: string;
}) {
  useAppearance();

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
        backgroundColor: isDark()
          ? "#262626"
          : themeColor(accent ? "#FBE4E2" : "#DCE9FC", "surface"),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontWeight: "800",
          color: accent ?? colors.blue,
          fontSize: size > textSize(50) ? textSize(24) : textSize(14),
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
  const appearance = useAppearance();
  const gate = useGate();
  const { session } = useAuth();
  const vote = useToggle("helpful_votes", "post_id", post.id);
  const save = useToggle("saved_items", "post_id", post.id);
  const [error, setError] = useState("");
  const act = async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
      if (appearance.haptics) void Haptics.selectionAsync().catch(() => {});
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
          <PlaneReaction active={vote.active} />
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
        <SendPost post={post} />
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
  useAppearance();

  return (
    <Button
      label="Paylaş"
      secondary
      onPress={() => {
        void Share.share({
          message: `${post.title} — Vizesel\n${Platform.OS === "web" ? window.location.origin + webPath(postPath(post)) : "https://ugurkihsan1.github.io/vizerotasi" + postPath(post)}`,
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
  useAppearance();

  const { session } = useAuth();
  const { data: countries } = useCountries();
  const { data: author } = useProfile(post.user_id);
  const country = countries?.find((x) => x.id === post.country_id);
  const days = processingDays(post.application_date, post.decision_date);
  const rejected = post.kind === "experience" && post.result === "rejected";
  const accent = rejected ? (isDark() ? "#F197A2" : "#9E3041") : colors.blue;
  return (
    <View
      style={[
        styles.card,
        {
          padding: 0,
          gap: 0,
          overflow: "hidden",
          backgroundColor: rejected
            ? isDark()
              ? "#2B2027"
              : "#FFF3F1"
            : post.kind === "general"
              ? themeColor("#F4EFFB", "surface")
              : post.kind === "experience"
                ? themeColor("#F0F7F2", "surface")
                : post.kind === "question"
                  ? themeColor("#EFF5FD", "surface")
                  : post.kind === "tip"
                    ? themeColor("#FFF5E7", "surface")
                    : themeColor("#FFFFFF", "surface"),
        },
        rejected && { borderColor: isDark() ? "#66404C" : "#EBC8C5" },
        post.kind === "tip" && {
          borderColor: themeColor("#EDDCC4", "border"),
        },
        post.kind === "question" && {
          borderColor: themeColor("#DDE6E9", "border"),
        },
      ]}
    >
      {post.kind === "experience" && post.result && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 13,
            minHeight: 46,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            backgroundColor:
              post.result === "approved"
                ? themeColor("#CDECD9", "status")
                : post.result === "rejected"
                  ? isDark()
                    ? "#482832"
                    : "#F7D1CD"
                  : themeColor("#FFE8A6", "status"),
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: textSize(14),
              color:
                post.result === "approved"
                  ? themeColor("#176744", "text")
                  : post.result === "rejected"
                    ? accent
                    : themeColor("#866000", "text"),
            }}
          >
            {resultLabels[post.result]}
          </Text>
          {post.result !== "waiting" && days !== null && (
            <Text
              style={{
                fontSize: textSize(12),
                fontWeight: "600",
                color: rejected ? accent : colors.navy,
              }}
            >
              {days} günde sonuçlandı
            </Text>
          )}
        </View>
      )}
      <View style={{ padding: detail ? 20 : 18, gap: detail ? 14 : 12 }}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/country/${post.country_id}`)}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
            >
              {country && (
                <CountryFlag
                  code={country.code}
                  emoji={country.flag}
                  name={country.name}
                />
              )}
              <Text style={styles.pillText}>{country?.name ?? "Ülke"}</Text>
            </View>
          </Pressable>
          <Text
            style={[
              styles.muted,
              {
                color:
                  post.kind === "general"
                    ? themeColor("#8050AD", "text")
                    : post.kind === "tip"
                      ? themeColor("#A76A1B", "text")
                      : post.kind === "question"
                        ? themeColor("#3476B5", "text")
                        : accent,
                fontSize: textSize(11),
                backgroundColor:
                  post.kind === "general"
                    ? themeColor("#EBDFF7", "surface")
                    : post.kind === "tip"
                      ? themeColor("#F9EAD2", "surface")
                      : post.kind === "question"
                        ? themeColor("#E2EEFA", "surface")
                        : rejected
                          ? isDark()
                            ? "#482832"
                            : "#FBE3DF"
                          : themeColor("#EDF3F0", "surface"),
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 7,
              },
            ]}
          >
            {kindLabels[post.kind]}
          </Text>
          {session?.user.id === post.user_id && (
            <DeleteContent id={post.id} compact redirect={detail} />
          )}
        </View>
        {detail && (
          <Pressable
            style={styles.row}
            accessibilityRole="link"
            onPress={() => author && router.push(`/profile/${author.username}`)}
          >
            <Avatar
              name={author?.display_name ?? "Üye"}
              url={author?.avatar_url}
              accent={rejected ? accent : undefined}
            />
            <View>
              <Text style={styles.pillText}>
                {author?.username ?? "Topluluk üyesi"}
              </Text>
              <Text style={styles.muted}>
                {author?.membership_level} · {formatDate(post.created_at)}
              </Text>
            </View>
          </Pressable>
        )}
        {post.status !== "approved" && (
          <Text style={{ color: colors.amber }}>
            {statusLabels[post.status]}
          </Text>
        )}
        {post.is_sample && (
          <Text style={{ color: colors.amber }}>Örnek İçerik</Text>
        )}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={post.title}
          onPress={() => !detail && router.push(postPath(post))}
          style={{ gap: 12 }}
        >
          <Text
            numberOfLines={detail ? undefined : 2}
            style={[
              styles.heading,
              {
                fontSize: detail ? textSize(22) : textSize(20),
                lineHeight: 27,
                letterSpacing: -0.35,
              },
            ]}
          >
            {post.title}
          </Text>
          {!detail && post.kind === "experience" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {post.result === "approved" &&
                post.granted_days != null &&
                post.granted_days > 0 && (
                  <View
                    style={{
                      backgroundColor: themeColor("#EAF3ED", "surface"),
                      paddingHorizontal: 11,
                      paddingVertical: 6,
                      borderRadius: 9,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: textSize(12),
                        fontWeight: "700",
                        color: themeColor("#24766C", "text"),
                      }}
                    >
                      {post.granted_days} gün vize
                      {post.entries
                        ? ` · ${{ single: "Tek giriş", double: "Çift giriş", multi: "Çok giriş" }[post.entries] ?? ""}`
                        : ""}
                    </Text>
                  </View>
                )}
              {[post.city, post.employment_status]
                .filter(Boolean)
                .map((label, i) => (
                  <Text
                    key={i}
                    style={{ fontSize: textSize(12), color: colors.muted }}
                  >
                    {i > 0 ? "· " : ""}
                    {label}
                  </Text>
                ))}
              {!!post.purpose && (
                <Text
                  style={{
                    fontSize: textSize(12),
                    color: accent,
                    fontWeight: "600",
                  }}
                >
                  {post.city || post.employment_status ? "· " : ""}
                  {post.purpose}
                </Text>
              )}
            </View>
          )}
          {detail && post.kind === "experience" && !!post.purpose && (
            <Text
              style={[
                styles.pillText,
                { fontSize: textSize(12), color: accent },
              ]}
            >
              {post.purpose}
            </Text>
          )}
          {!!post.body && (
            <Text style={styles.text} numberOfLines={detail ? undefined : 2}>
              {post.body}
            </Text>
          )}
          {(post.kind === "tip" || post.kind === "experience") &&
            (post.source_type === "official" ? (
              <Text style={styles.muted}>
                {detail
                  ? "Resmî kaynağa dayalı paylaşım · Kaynak ve kapsamı detayda kontrol et."
                  : "Resmî kaynak referansı"}
              </Text>
            ) : (
              <VerificationLabel
                postId={post.id}
                compact
                color={rejected ? accent : undefined}
              />
            ))}
        </Pressable>
        {!detail && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${author?.username ?? "Üye"} profilini aç`}
            onPress={() => author && router.push(`/profile/${author.username}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingTop: 3,
            }}
          >
            <Avatar
              name={author?.display_name ?? "Üye"}
              url={author?.avatar_url}
              size={26}
              accent={rejected ? accent : undefined}
            />
            <Text
              style={{
                flex: 1,
                fontSize: textSize(12),
                fontWeight: "600",
                color: colors.navy,
              }}
              numberOfLines={1}
            >
              {author?.username ?? "Topluluk üyesi"}
            </Text>
            <Text style={{ fontSize: textSize(11), color: colors.muted }}>
              {formatDate(post.created_at)}
            </Text>
          </Pressable>
        )}
        {post.status === "approved" && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: themeColor("#EDF0EC", "border"),
              paddingTop: 8,
            }}
          >
            <Actions post={post} />
          </View>
        )}
      </View>
    </View>
  );
}
