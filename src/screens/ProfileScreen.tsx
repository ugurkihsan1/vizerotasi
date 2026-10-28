import { ProfileMessagesButton } from "../components/ChatEntry";
import { ProfileConnections } from "../components/ProfileConnections";
import { useSocialProfile } from "../lib/social";
import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { useAuth } from "../lib/auth";
import { chatError } from "../lib/chat";
import { MemberBadge } from "../components/MemberBadge";
import { ProfileComments } from "../components/ProfileComments";
import { SavedDocuments } from "../components/SavedDocuments";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  PanResponder,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { Feed } from "../components/Feed";
import { Avatar } from "../components/PostCard";
import { styles, colors, Button, Message, useGate } from "../components/ui";
export function ProfileScreen({
  profile,
  own: suppliedOwn = false,
}: {
  profile: Profile;
  own?: boolean;
}) {
  const appearance = useAppearance();

  const [tab, setTab] = useState("Paylaşımlar");
  const { session } = useAuth();
  const own = suppliedOwn || session?.user.id === profile.id;
  const social = useSocialProfile(profile.id);
  const canView = own || social.data?.can_view !== false;
  const tabs = [
    "Paylaşımlar",
    "Deneyimler",
    "Sorular",
    "Yorumlar",
    ...(own ? ["Kaydedilenler", "Belgelerim"] : []),
  ];
  const [slide] = useState(() => new Animated.Value(0));
  const changeTab = (next: string) => {
    if (next === tab) return;
    const direction = tabs.indexOf(next) > tabs.indexOf(tab) ? 1 : -1;
    setTab(next);
    if (!appearance.motionReduced) {
      slide.setValue(direction * 20);
      Animated.timing(slide, {
        toValue: 0,
        duration: 140,
        useNativeDriver: false,
      }).start();
    }
  };
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 55 && Math.abs(g.dy) < 18,
    onPanResponderMove: (_, g) => {
      if (!appearance.motionReduced)
        slide.setValue(Math.max(-35, Math.min(35, g.dx * 0.2)));
    },
    onPanResponderTerminate: () => slide.setValue(0),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 55 && Math.abs(g.dy) < 40) {
        const next = tabs[tabs.indexOf(tab) + (g.dx < 0 ? 1 : -1)];
        if (next) {
          changeTab(next);
          return;
        }
      }
      Animated.timing(slide, {
        toValue: 0,
        duration: appearance.motionReduced ? 0 : 140,
        useNativeDriver: false,
      }).start();
    },
  });
  const gate = useGate();
  const [chatBusy, setChatBusy] = useState(false),
    [chatNotice, setChatNotice] = useState("");
  const badges = useQuery({
    queryKey: ["badges", profile.id],
    queryFn: async () => {
      const r = await db()
        .from("user_badges")
        .select("badge_id,badges(name,icon,badge_group)")
        .eq("user_id", profile.id);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const visibleBadges = (badges.data ?? []).flatMap((row) => {
    const badge = (Array.isArray(row.badges) ? row.badges[0] : row.badges) as {
      name: string;
      icon?: string;
      badge_group?: string;
    } | null;
    return !badge ||
      badge.badge_group === "level" ||
      badge.name === profile.membership_level
      ? []
      : [{ id: row.badge_id, ...badge }];
  });
  const stats = useQuery({
    queryKey: ["profile-stats", profile.id],
    queryFn: async () => {
      const r = await db().rpc("profile_stats", { target_user: profile.id });
      if (r.error) throw r.error;
      return (r.data?.[0] ?? null) as {
        contributions: number;
        helpful: number;
        countries: number;
      } | null;
    },
  });
  return (
    <Animated.View
      style={{ flex: 1, transform: [{ translateX: slide }] }}
      {...swipe.panHandlers}
    >
      <Feed
        contentOnly={!canView || tab === "Yorumlar" || tab === "Belgelerim"}
        author={tab === "Kaydedilenler" ? undefined : profile.id}
        saved={tab === "Kaydedilenler"}
        baseFilter={{
          kind:
            tab === "Deneyimler"
              ? "experience"
              : tab === "Sorular"
                ? "question"
                : undefined,
        }}
        header={
          <View style={{ gap: 18 }}>
            <View
              style={[styles.card, { padding: 18, gap: 12, borderRadius: 20 }]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <Avatar
                  name={profile.display_name}
                  url={profile.avatar_url}
                  size={60}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={[
                      styles.heading,
                      { fontSize: textSize(22), lineHeight: textSize(28) },
                    ]}
                  >
                    {profile.display_name}
                  </Text>
                  <Text style={styles.muted}>@{profile.username}</Text>
                </View>
                {own && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Profil ve ayarlar"
                    onPress={() => router.push("/settings")}
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={21}
                      color={colors.muted}
                    />
                  </Pressable>
                )}
              </View>
              <View style={styles.row}>
                <MemberBadge
                  label={profile.membership_level}
                  pioneer={profile.is_pioneer}
                />
                {profile.role !== "user" && (
                  <Text
                    style={{
                      fontSize: textSize(11),
                      fontWeight: "600",
                      color: colors.amber,
                    }}
                  >
                    {profile.role === "admin" ? "Yönetici" : "Moderatör"}
                  </Text>
                )}
              </View>
              {visibleBadges.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 14 }}
                >
                  {visibleBadges.map((badge) => (
                    <View
                      key={badge.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingVertical: 4,
                      }}
                    >
                      <Ionicons
                        name={
                          (badge.icon ??
                            "ribbon-outline") as keyof typeof Ionicons.glyphMap
                        }
                        size={14}
                        color={colors.amber}
                      />
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: textSize(11),
                          fontWeight: "600",
                        }}
                      >
                        {badge.name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              {!!profile.bio && <Text style={styles.text}>{profile.bio}</Text>}
              <ProfileConnections
                id={profile.id}
                own={own}
                action={
                  own ? (
                    <ProfileMessagesButton />
                  ) : (
                    <Button
                      secondary
                      label="Mesaj gönder"
                      disabled={chatBusy}
                      onPress={() =>
                        gate.require(() => {
                          setChatBusy(true);
                          setChatNotice("");
                          void Promise.resolve(
                            db().rpc("chat_create_private", {
                              recipients: [profile.id],
                              room_title: "",
                            }),
                          )
                            .then((r) => {
                              if (r.error) throw r.error;
                              router.push(`/chat/${r.data}`);
                            })
                            .catch((e) => setChatNotice(chatError(e)))
                            .finally(() => setChatBusy(false));
                        })
                      }
                    />
                  )
                }
              />
              <Message text={chatNotice} />
              {gate.view}
              <View
                style={{
                  flexDirection: "row",
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: themeColor("#E5EAE7", "border"),
                }}
              >
                {[
                  [stats.data?.contributions ?? 0, "Paylaşım"],
                  [stats.data?.helpful ?? 0, "Faydalı"],
                  [profile.badge_score ?? profile.reputation, "Puan"],
                ].map(([value, label]) => (
                  <View
                    key={label}
                    style={{ flex: 1, alignItems: "center", gap: 3 }}
                  >
                    <Text
                      style={{
                        fontSize: textSize(18),
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      {value}
                    </Text>
                    <Text
                      style={{ fontSize: textSize(11), color: colors.muted }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 24,
                borderBottomWidth: 1,
                borderBottomColor: themeColor("#E4E4E4", "border"),
              }}
            >
              {tabs.map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="tab"
                  accessibilityLabel={t}
                  accessibilityState={{ selected: tab === t }}
                  aria-selected={tab === t}
                  onPress={() => changeTab(t)}
                  style={{
                    minHeight: 46,
                    justifyContent: "center",
                    borderBottomWidth: tab === t ? 2 : 0,
                    borderBottomColor: colors.navy,
                    paddingHorizontal: 2,
                  }}
                >
                  <Text
                    style={{
                      color: tab === t ? colors.navy : colors.muted,
                      fontWeight: tab === t ? "700" : "500",
                      fontSize: textSize(13),
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {!canView && (
              <Text style={styles.muted}>
                {social.isPending
                  ? "Profil yükleniyor…"
                  : "Bu profile erişilemiyor."}
              </Text>
            )}
            {canView && own && tab === "Belgelerim" && <SavedDocuments />}
            {canView && tab === "Yorumlar" && (
              <ProfileComments user={profile.id} />
            )}
          </View>
        }
      />
    </Animated.View>
  );
}
