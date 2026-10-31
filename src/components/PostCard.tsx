import { formatVisaDuration } from "../lib/visa-duration";
import { webPath } from "../lib/web-path";
import { PostReactions } from "./PostReactions";
import { SendPost } from "./SendPost";
import { DeleteContent } from "./DeleteContent";
import { textSize, useAppearance } from "../lib/appearance";

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
export function Actions({
  post,
  compact = false,
}: {
  post: Post;
  compact?: boolean;
}) {
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
      <View
        style={[
          styles.row,
          { justifyContent: "space-between" },
          compact && { flexWrap: "nowrap", gap: 4 },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              vote.active ? "Faydalı işaretini kaldır" : "Faydalı bul"
            }
            accessibilityState={{ selected: vote.active }}
            disabled={session?.user.id === post.user_id || vote.pending}
            onPress={() => gate.require(() => void act(vote.toggle))}
            style={{
              minWidth: 44,
              minHeight: 44,
              justifyContent: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <PlaneReaction active={vote.active} />
          </Pressable>
          <PostReactions
            postId={post.id}
            count={post.helpful_count}
            compact={compact}
          />
        </View>
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
          <Text style={styles.muted}>
            {compact ? post.comment_count : `${post.comment_count} Yanıt`}
          </Text>
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
  countryPage = false,
}: {
  post: Post;
  detail?: boolean;
  countryPage?: boolean;
}) {
  const { dark } = useAppearance();
  const { session } = useAuth();
  const { data: countries } = useCountries();
  const { data: author } = useProfile(post.user_id);
  const country = countries?.find((item) => item.id === post.country_id);
  const days =
    post.processing_days ??
    processingDays(post.application_date, post.decision_date);
  const outcome = post.kind === "experience" ? post.result : null;
  const accent =
    outcome === "rejected"
      ? dark
        ? "#EDA5AB"
        : "#A13C49"
      : outcome === "approved"
        ? dark
          ? "#91D5B0"
          : "#247655"
        : post.kind === "tip" || outcome === "waiting"
          ? dark
            ? "#DCC184"
            : "#936A23"
          : post.kind === "question"
            ? dark
              ? "#A2BEDF"
              : "#4E729B"
            : colors.muted;
  const outcomeBackground =
    outcome === "rejected"
      ? dark
        ? "#2B1F24"
        : "#FBF1F2"
      : outcome === "approved"
        ? dark
          ? "#17271F"
          : "#EEF7F1"
        : dark
          ? "#282317"
          : "#FAF5E9";
  const kindIcon = {
    experience: "document-text-outline",
    general: "compass-outline",
    question: "help-circle-outline",
    tip: "flash-outline",
    update: "megaphone-outline",
  } as const;
  const duration =
    post.result === "approved" && (post.granted_days ?? 0) > 0
      ? `${formatVisaDuration(post.granted_days!)} vize${post.entries ? ` · ${{ single: "Tek giriş", double: "Çift giriş", multi: "Çok giriş" }[post.entries] ?? ""}` : ""}`
      : null;
  const visaDetails = [duration, post.purpose].filter(Boolean).join(" · ");
  const context = [post.city, post.employment_status]
    .filter(Boolean)
    .join(" · ");
  const name = author?.display_name ?? "Üye";
  const username = author?.username;
  return (
    <View
      testID={`post-${post.id}`}
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: dark ? "#25292E" : "#E9EDF1",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${username ?? "Üye"} profilini aç`}
          accessibilityHint={context || undefined}
          onPress={() => author && router.push(`/profile/${author.username}`)}
          style={{
            flex: 1,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Avatar name={name} url={author?.avatar_url} size={34} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: textSize(14),
                fontWeight: "700",
                color: colors.navy,
              }}
            >
              {name}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                fontSize: textSize(11),
                lineHeight: textSize(15),
                color: colors.muted,
              }}
            >
              {username ? `@${username}` : "Topluluk üyesi"}
              {context ? ` · ${context}` : ""}
            </Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: textSize(11), color: colors.muted }}>
          {relativePostTime(post.created_at)}
        </Text>
        {session?.user.id === post.user_id && (
          <DeleteContent id={post.id} compact redirect={detail} />
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
          columnGap: 12,
          rowGap: 5,
        }}
      >
        {!countryPage && (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/country/${post.country_id}`)}
            hitSlop={10}
            style={{
              minHeight: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            {country && (
              <CountryFlag
                code={country.code}
                emoji={country.flag}
                name={country.name}
              />
            )}
            <Text
              style={{
                fontSize: textSize(12),
                fontWeight: "500",
                color: colors.text,
              }}
            >
              {country?.name ?? "Ülke"}
            </Text>
            <Ionicons name="chevron-forward" size={11} color={colors.muted} />
          </Pressable>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name={kindIcon[post.kind]} size={14} color={accent} />
          <Text
            style={{ fontSize: textSize(11), fontWeight: "500", color: accent }}
          >
            {post.kind === "tip" ? "Önemli bilgi" : kindLabels[post.kind]}
          </Text>
        </View>
      </View>

      {post.status !== "approved" && (
        <Text style={{ fontSize: textSize(12), color: colors.amber }}>
          Paylaşım · {statusLabels[post.status]}
        </Text>
      )}
      {post.is_sample && (
        <Text style={{ fontSize: textSize(11), color: colors.muted }}>
          Örnek içerik
        </Text>
      )}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={post.title}
        onPress={() => !detail && router.push(postPath(post))}
        style={{
          gap: 8,
          ...(post.kind === "tip"
            ? {
                backgroundColor: dark ? "#211E17" : "#FFFBF2",
                borderLeftWidth: 3,
                borderLeftColor: dark ? "#9C814D" : "#D2AE65",
                padding: 12,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8,
              }
            : {}),
        }}
      >
        <Text
          numberOfLines={detail ? undefined : 2}
          style={{
            fontSize: textSize(detail ? 22 : 18),
            lineHeight: textSize(detail ? 29 : 25),
            letterSpacing: -0.35,
            fontWeight: "700",
            color: colors.navy,
          }}
        >
          {post.title}
        </Text>
        {!!post.body && (
          <Text
            numberOfLines={detail ? undefined : 3}
            style={{
              fontSize: textSize(detail ? 16 : 15),
              lineHeight: textSize(detail ? 24 : 22),
              color: colors.text,
            }}
          >
            {post.body}
          </Text>
        )}
      </Pressable>

      {outcome && (
        <View
          style={{
            backgroundColor: outcomeBackground,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 5,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name={
                  outcome === "approved"
                    ? "checkmark-circle-outline"
                    : outcome === "rejected"
                      ? "close-circle-outline"
                      : "time-outline"
                }
                size={17}
                color={accent}
              />
              <Text
                style={{
                  fontSize: textSize(13),
                  fontWeight: "600",
                  color: accent,
                }}
              >
                {
                  {
                    approved: "Onaylandı",
                    rejected: "Reddedildi",
                    waiting: "Sonuç bekleniyor",
                  }[outcome]
                }
              </Text>
            </View>
            {outcome !== "waiting" && days !== null && (
              <Text style={{ fontSize: textSize(11), color: colors.muted }}>
                {days} günde sonuçlandı
              </Text>
            )}
          </View>
          {!!visaDetails && (
            <Text
              style={{
                fontSize: textSize(12),
                fontWeight: "500",
                color: colors.text,
              }}
            >
              {visaDetails}
            </Text>
          )}
        </View>
      )}

      {(post.kind === "tip" || post.kind === "experience") && (
        <View style={{ alignItems: "flex-end" }}>
          {post.source_type === "official" ? (
            <Text style={{ fontSize: textSize(10), color: colors.muted }}>
              Resmî kaynak referansı
            </Text>
          ) : (
            <VerificationLabel postId={post.id} compact color={colors.muted} />
          )}
        </View>
      )}
      {post.status === "approved" && <Actions post={post} compact />}
    </View>
  );
}
