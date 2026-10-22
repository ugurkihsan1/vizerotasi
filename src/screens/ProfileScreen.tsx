import { ProfileComments } from "../components/ProfileComments";
import { SavedDocuments } from "../components/SavedDocuments";
import { View, Text } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Profile } from "../lib/types";
import { Feed } from "../components/Feed";
import { Avatar } from "../components/PostCard";
import { styles, Chip, Button } from "../components/ui";
export function ProfileScreen({
  profile,
  own = false,
}: {
  profile: Profile;
  own?: boolean;
}) {
  const [tab, setTab] = useState("Paylaşımlar");
  const { session } = useAuth();
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
        <View style={{ gap: 16 }}>
          <View style={styles.row}>
            <Avatar name={profile.display_name} url={profile.avatar_url} />
            <View>
              <Text style={styles.title}>{profile.display_name}</Text>
              <Text style={styles.muted}>@{profile.username}</Text>
            </View>
          </View>
          <Text style={styles.text}>
            {profile.bio || "Her deneyim bir sonraki yolcuya ışık tutar."}
          </Text>
          <Text style={styles.pillText}>
            {profile.membership_level} · {profile.reputation} katkı puanı
          </Text>
          <Text style={styles.muted}>
            {new Date(profile.created_at).toLocaleDateString("tr-TR")} tarihinde
            katıldı
          </Text>
          <View style={styles.row}>
            <Text style={styles.pill}>
              {stats.data?.contributions ?? 0} katkı
            </Text>
            <Text style={styles.pill}>{stats.data?.helpful ?? 0} faydalı</Text>
            <Text style={styles.pill}>{stats.data?.countries ?? 0} ülke</Text>
          </View>
          <View style={styles.row}>
            {badges.data?.map((b) => (
              <Text key={b.badge_id} style={styles.pill}>
                🏅 {(b.badges as unknown as { name: string })?.name}
              </Text>
            ))}
          </View>
          <View style={styles.row}>
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
          </View>
          {own && (
            <Button
              secondary
              label="Profil ve ayarlar"
              onPress={() => router.push("/settings")}
            />
          )}
          {own && ["moderator", "admin"].includes(profile.role) && (
            <Button
              label="Moderasyon kuyruğu"
              onPress={() => router.push("/moderation")}
            />
          )}
          {own && profile.role === "admin" && (
            <Button
              secondary
              label="İçerik ve üye yönetimi"
              onPress={() => router.push("/admin")}
            />
          )}
          {own && tab === "Belgelerim" && <SavedDocuments />}
          {tab === "Yorumlar" && <ProfileComments user={profile.id} />}
          {own && session && (
            <Text style={styles.muted}>
              Gönderilerinin inceleme durumunu “İncelemede” bölümünden takip
              edebilirsin.
            </Text>
          )}
        </View>
      }
    />
  );
}
