import { formatVisaDuration } from "../lib/visa-duration";
import { webPath } from "../lib/web-path";
import { SendPost } from "./SendPost";
import { DeleteContent } from "./DeleteContent";
import { themeColor, textSize, useAppearance, isDark } from "../lib/appearance";

import { PlaneReaction } from "./PlaneReaction";
import { VerificationLabel } from "./VerificationLabel";
import { Ionicons } from "@expo/vector-icons";
import { CountryFlag } from "./CountryFlag";
import { processingDays, relativePostTime } from "../lib/dates";
import { Text, View, Pressable, Share, Platform } from "react-native";
import { Avatar } from "./Avatar";
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
export { Avatar } from "./Avatar";

export const kindLabels = {
  experience: "Vize deneyimi",
  general: "Seyahat paylaşımı",
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
  const days =
    post.processing_days ??
    processingDays(post.application_date, post.decision_date);
  const outcome = post.kind === "experience" ? post.result : null;
  const rejected = outcome === "rejected";
  const tone = rejected
    ? "red"
    : outcome === "approved"
      ? "green"
      : outcome === "waiting" || post.kind === "tip"
        ? "amber"
        : null;
  const accent =
    tone === "red"
      ? isDark()
        ? "#F197A2"
        : "#9E3041"
      : tone === "green"
        ? isDark()
          ? "#78D5A3"
          : "#176744"
        : tone === "amber"
          ? isDark()
            ? "#EBC86E"
            : "#875B10"
          : colors.blue;
  const toneBackground =
    tone === "red"
      ? isDark()
        ? "#2B2027"
        : "#FFF3F1"
      : tone === "green"
        ? isDark()
          ? "#182B22"
          : "#F0F7F2"
        : isDark()
          ? "#302919"
          : "#FFF6E5";
  const toneCap =
    tone === "red"
      ? isDark()
        ? "#482832"
        : "#F7D1CD"
      : tone === "green"
        ? isDark()
          ? "#254533"
          : "#CDECD9"
        : isDark()
          ? "#4B3C1B"
          : "#FFE8A6";
  return (
    <View
      style={[
        styles.card,
        {
          padding: 0,
          gap: 0,
          overflow: "hidden",
          backgroundColor: tone
            ? toneBackground
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
        post.kind === "question" && {
          borderColor: themeColor("#DDE6E9", "border"),
        },
        tone && {
          borderColor:
            tone === "red"
              ? isDark()
                ? "#66404C"
                : "#EBC8C5"
              : tone === "green"
                ? isDark()
                  ? "#365D47"
                  : "#D1E6D8"
                : isDark()
                  ? "#6B582E"
                  : "#E9D8A9",
        },
      ]}
    >
      {post.kind === "experience" && post.result && (
        <View
          style={{
            paddingHorizontal: detail ? 20 : 14,
            paddingVertical: detail ? 13 : 8,
            minHeight: detail ? 46 : 34,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            backgroundColor: toneCap,
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: textSize(14),
              color: accent,
            }}
          >
            {resultLabels[post.result]}
          </Text>
          {post.result !== "waiting" && days !== null && (
            <Text
              style={{
                fontSize: textSize(12),
                fontWeight: "600",
                color: accent,
              }}
            >
              {days} günde sonuçlandı
            </Text>
          )}
        </View>
      )}
      <View style={{ padding: detail ? 16 : 14, gap: detail ? 10 : 8 }}>
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginLeft: "auto",
            }}
          >
            <Text
              style={[
                styles.muted,
                {
                  color: tone
                    ? accent
                    : post.kind === "general"
                      ? themeColor("#8050AD", "text")
                      : post.kind === "question"
                        ? themeColor("#3476B5", "text")
                        : accent,
                  fontSize: textSize(11),
                  backgroundColor: tone
                    ? toneCap
                    : post.kind === "general"
                      ? themeColor("#EBDFF7", "surface")
                      : post.kind === "question"
                        ? themeColor("#E2EEFA", "surface")
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
              size={32}
              accent={tone ? accent : undefined}
            />
            <View>
              <Text style={styles.pillText}>
                {author?.username ?? "Topluluk üyesi"}
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "400",
                    fontSize: textSize(12),
                  }}
                >
                  {[post.city, post.employment_status]
                    .filter(Boolean)
                    .map((label) => ` · ${label}`)
                    .join("")}
                </Text>
              </Text>
              <Text style={styles.muted}>
                {relativePostTime(post.created_at)}
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
          style={{ gap: detail ? 10 : 7 }}
        >
          <Text
            numberOfLines={detail ? undefined : 2}
            style={[
              styles.heading,
              {
                fontSize: detail ? textSize(20) : textSize(18),
                lineHeight: detail ? 26 : 23,
                letterSpacing: -0.35,
              },
            ]}
          >
            {post.title}
          </Text>
          {post.kind === "experience" &&
            (post.purpose ||
              (post.result === "approved" && (post.granted_days ?? 0) > 0)) && (
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
                        backgroundColor: isDark()
                          ? "#254533"
                          : themeColor("#EAF3ED", "status"),
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 9,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: textSize(12),
                          fontWeight: "700",
                          color: accent,
                        }}
                      >
                        {formatVisaDuration(post.granted_days)} vize
                        {post.entries
                          ? ` · ${{ single: "Tek giriş", double: "Çift giriş", multi: "Çok giriş" }[post.entries] ?? ""}`
                          : ""}
                      </Text>
                    </View>
                  )}
                {!!post.purpose && (
                  <Text
                    style={{
                      fontSize: textSize(12),
                      color: accent,
                      fontWeight: "600",
                    }}
                  >
                    {post.purpose}
                  </Text>
                )}
              </View>
            )}
          {!!post.body && (
            <Text
              style={[
                styles.text,
                !detail && { fontSize: textSize(14), lineHeight: 20 },
              ]}
              numberOfLines={detail ? undefined : 2}
            >
              {post.body}
            </Text>
          )}
          {(post.kind === "tip" || post.kind === "experience") &&
            (post.source_type === "official" ? (
              <Text style={styles.muted}>Resmî kaynak referansı</Text>
            ) : (
              <VerificationLabel
                postId={post.id}
                compact
                color={tone ? accent : undefined}
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
              paddingTop: 1,
            }}
          >
            <Avatar
              name={author?.display_name ?? "Üye"}
              url={author?.avatar_url}
              size={24}
              accent={tone ? accent : undefined}
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
              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "400",
                  fontSize: textSize(11),
                }}
              >
                {[post.city, post.employment_status]
                  .filter(Boolean)
                  .map((label) => ` · ${label}`)
                  .join("")}
              </Text>
            </Text>
            <Text style={{ fontSize: textSize(11), color: colors.muted }}>
              {relativePostTime(post.created_at)}
            </Text>
          </Pressable>
        )}
        {post.status === "approved" && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: themeColor("#EDF0EC", "border"),
              paddingTop: detail ? 8 : 2,
            }}
          >
            <Actions post={post} />
          </View>
        )}
      </View>
    </View>
  );
}
