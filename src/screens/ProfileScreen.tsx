import { formatDate } from "../lib/dates";
import { MemberBadge } from "../components/MemberBadge";
import { ProfileComments } from "../components/ProfileComments";
import { SavedDocuments } from "../components/SavedDocuments";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { Feed } from "../components/Feed";
import { Avatar } from "../components/PostCard";
import { styles, Chip, colors } from "../components/ui";
export function ProfileScreen({
  profile,
  own = false,
}: {
  profile: Profile;
  own?: boolean;
}) {
  const [tab, setTab] = useState("Paylaşımlar");
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
      return r.data?.[0] as
        | { contributions: number; helpful: number; countries: number }
        | undefined;
    },
  });
  return (
    <Feed
      key={tab}
      contentOnly={tab === "Yorumlar" || tab === "Belgelerim"}
      author={tab === "Kaydedilenler" ? undefined : profile.id}
      saved={tab === "Kaydedilenler"}
      baseFilter={{
        kind: tab === "Deneyimler" ? "experience" : undefined,
        pending: tab === "İncelemede",
      }}
      header={
        <View style={{ gap: 18 }}>
          <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
            <View
              style={{
                height: 86,
                backgroundColor: colors.navy,
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
                  borderColor: "#49645F",
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
                  borderColor: "#49645F",
                  right: -5,
                  top: -96,
                }}
              />
              <Text
                style={{
                  position: "absolute",
                  right: 22,
                  bottom: 16,
                  fontSize: 10,
                  color: "#B2C9BF",
                  letterSpacing: 1.8,
                }}
              >
                HER DENEYİM BİR ROTA
              </Text>
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
                    backgroundColor: "#FFF",
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
              <View style={styles.row}>
                <MemberBadge
                  label={profile.membership_level}
                  pioneer={profile.is_pioneer}
                />
                {profile.role !== "user" && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.amber,
                      fontWeight: "600",
                    }}
                  >
                    {profile.role === "admin" ? "Yönetici" : "Moderatör"}
                  </Text>
                )}
              </View>
              <Text style={styles.text}>
                {profile.bio ||
                  "Bir deneyim, başka birinin yolunu kolaylaştırır."}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  paddingVertical: 15,
                  borderTopWidth: 1,
                  borderTopColor: "#EDF0EB",
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
                        fontSize: 23,
                        fontWeight: "800",
                        color: colors.navy,
                      }}
                    >
                      {value}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.muted, { fontSize: 11 }]}>
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
                <Text style={styles.muted}>
                  Gezgin’den Büyükelçi’ye uzanan rotan
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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
                    backgroundColor: "#FFF1D7",
                    padding: 12,
                    borderRadius: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#8E692C" }}>
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
                    backgroundColor: "#ECF2ED",
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
                  <Text style={styles.muted}>
                    Bekleyen paylaşımları incele ve yayınla
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.blue}
                />
              </Pressable>
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
                  <Text style={{ fontSize: 12, color: colors.blue }}>
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
            {[
              "Paylaşımlar",
              "Deneyimler",
              "Yorumlar",
              ...(own ? ["İncelemede", "Kaydedilenler", "Belgelerim"] : []),
            ].map((t) => (
              <Chip
                key={t}
                label={t}
                active={tab === t}
                onPress={() => setTab(t)}
              />
            ))}
          </ScrollView>
          {own && tab === "Belgelerim" && <SavedDocuments />}
          {tab === "Yorumlar" && <ProfileComments user={profile.id} />}
        </View>
      }
    />
  );
}
