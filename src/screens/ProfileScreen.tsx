import { ProfileConnections } from "../components/ProfileConnections";
import { useSocialProfile } from "../lib/social";
import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { useAuth } from "../lib/auth";
import { chatError } from "../lib/chat";
import { formatDate } from "../lib/dates";
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
import {
  styles,
  Chip,
  colors,
  Button,
  Message,
  useGate,
} from "../components/ui";
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
    setTab(next);
    if (!appearance.motionReduced) {
      slide.setValue(10);
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
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 55 && Math.abs(g.dy) < 40) {
        const next = tabs[tabs.indexOf(tab) + (g.dx < 0 ? 1 : -1)];
        if (next) changeTab(next);
      }
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
        .select("badge_id,badges(name)")
        .eq("user_id", profile.id);
      if (r.error) throw r.error;
      return r.data;
    },
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
            <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
              <View
                style={{
                  height: 64,
                  backgroundColor: themeColor("#182E43", "surface"),
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    borderWidth: 1,
                    borderColor: themeColor("#49645F", "border"),
                    right: 20,
                    top: -70,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 190,
                    height: 190,
                    borderRadius: 95,
                    borderWidth: 1,
                    borderColor: themeColor("#49645F", "border"),
                    right: -5,
                    top: -96,
                  }}
                />
              </View>
              <View style={{ padding: 20, paddingTop: 0, gap: 13 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: -36,
                  }}
                >
                  <View
                    style={{
                      padding: 5,
                      borderRadius: 44,
                      backgroundColor: themeColor("#FFF", "surface"),
                    }}
                  >
                    <Avatar
                      name={profile.display_name}
                      url={profile.avatar_url}
                      size={66}
                    />
                  </View>
                  {own && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Profil ve ayarlar"
                      onPress={() => router.push("/settings")}
                      style={{
                        minHeight: 44,
                        minWidth: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 30,
                      }}
                    >
                      <Ionicons
                        name="settings-outline"
                        size={22}
                        color={colors.muted}
                      />
                    </Pressable>
                  )}
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={styles.title}>{profile.display_name}</Text>
                  <Text style={styles.muted}>@{profile.username}</Text>
                </View>
                {!own && session?.user.id !== profile.id && (
                  <>
                    <Button
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
                    <Message text={chatNotice} />
                    {gate.view}
                  </>
                )}
                {own && (
                  <Button
                    secondary
                    label="Mesajlarım"
                    onPress={() => router.push("/messages")}
                  />
                )}
                <ProfileConnections id={profile.id} own={own} />
                <View style={styles.row}>
                  <MemberBadge
                    label={profile.membership_level}
                    pioneer={profile.is_pioneer}
                  />
                  {profile.role !== "user" && (
                    <Text
                      style={{
                        fontSize: textSize(11),
                        color: colors.amber,
                        fontWeight: "600",
                      }}
                    >
                      {profile.role === "admin" ? "Yönetici" : "Moderatör"}
                    </Text>
                  )}
                </View>
                {!!profile.bio && (
                  <Text style={styles.text}>{profile.bio}</Text>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    paddingVertical: 15,
                    borderTopWidth: 1,
                    borderTopColor: themeColor("#EDF0EB", "border"),
                    justifyContent: "space-between",
                  }}
                >
                  {[
                    [profile.badge_score ?? profile.reputation, "Rozet puanı"],
                    [stats.data?.contributions ?? 0, "Paylaşım"],
                    [stats.data?.helpful ?? 0, "Faydalı"],
                  ].map(([value, label]) => (
                    <View
                      key={label}
                      style={{ alignItems: "center", gap: 4, flex: 1 }}
                    >
                      <Text
                        style={{
                          fontSize: textSize(23),
                          fontWeight: "800",
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
                <Text style={[styles.muted, { fontSize: textSize(11) }]}>
                  {formatDate(profile.created_at)} tarihinde katıldı
                </Text>
              </View>
            </View>
            {own && (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Rozetlerim ve ilerlemem"
                onPress={() => router.push("/badges")}
                style={[
                  styles.card,
                  { flexDirection: "row", alignItems: "center", padding: 16 },
                ]}
              >
                <Ionicons name="ribbon-outline" size={26} color={colors.blue} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.pillText}>Rozetlerim ve ilerlemem</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            )}
            {badges.data && badges.data.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {badges.data.map((b) => (
                  <View
                    key={b.badge_id}
                    style={{
                      backgroundColor: themeColor("#FFF1D7", "surface"),
                      padding: 12,
                      borderRadius: 14,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: textSize(12),
                        color: themeColor("#8E692C", "text"),
                      }}
                    >
                      🏅 {(b.badges as unknown as { name: string })?.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            {own && profile.role !== "user" && (
              <View style={{ gap: 10 }}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push("/moderation")}
                  style={[
                    styles.card,
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      gap: 12,
                      backgroundColor: themeColor("#ECF2ED", "surface"),
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={25}
                    color={colors.blue}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pillText}>Moderasyon kuyruğu</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.blue}
                  />
                </Pressable>
                {profile.role === "admin" && (
                  <Button
                    secondary
                    label="Ülkeleri yönet"
                    onPress={() => router.push("/admin-countries")}
                  />
                )}
                {profile.role === "admin" && (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push("/admin")}
                    style={{
                      minHeight: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: textSize(12), color: colors.blue }}
                    >
                      İçerik ve üye yönetimi →
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {tabs.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={tab === t}
                  onPress={() => changeTab(t)}
                />
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
