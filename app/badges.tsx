import { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { db } from "../src/lib/supabase";
import {
  useMembershipLevels,
  achievementDefinitions,
  criteria,
  type MembershipLevel,
} from "../src/lib/community";
import { MemberBadge } from "../src/components/MemberBadge";
import { styles, colors, Button, Sheet } from "../src/components/ui";
export default function Badges() {
  const { profile } = useAuth();
  const { data: levels } = useMembershipLevels();
  const [selected, setSelected] = useState<MembershipLevel | null>(null);
  const [achievement, setAchievement] = useState<
    (typeof achievementDefinitions)[number] | null
  >(null);
  const earned = useQuery({
    queryKey: ["earned-community-badges", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const r = await db()
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", profile!.id);
      if (r.error) throw r.error;
      return r.data.map((b) => b.badge_id) as string[];
    },
  });
  const rank = profile?.reputation_metrics?.level_rank ?? 0;
  const next = levels?.find((l) => l.rank > rank);
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 10,
            letterSpacing: 1.3,
            fontWeight: "700",
            color: colors.blue,
          }}
        >
          HER KATKININ BİR DEĞERİ VAR
        </Text>
        <Text style={styles.title}>Birlikte yol al, iz bırak.</Text>
        <Text style={styles.muted}>
          Sayıdan fazlası: faydalı yorumlar, farklı ülkeler ve zamanla oluşan
          güven.
        </Text>
      </View>
      {profile && (
        <View style={styles.card}>
          <MemberBadge
            label={profile.membership_level}
            pioneer={profile.is_pioneer}
          />
          <View style={styles.row}>
            <Text
              style={{ fontSize: 34, fontWeight: "800", color: colors.navy }}
            >
              {profile.badge_score ?? 0}
            </Text>
            <Text style={styles.muted}>rozet puanı</Text>
          </View>
          {next && (
            <>
              <Text style={styles.pillText}>Sıradaki rota: {next.name}</Text>
              <View
                accessibilityRole="progressbar"
                aria-valuemin={0}
                aria-valuemax={next.min_score}
                aria-valuenow={Math.min(
                  profile.badge_score ?? 0,
                  next.min_score,
                )}
                accessibilityLabel="Rozet puanı ilerlemesi"
                style={{
                  height: 7,
                  backgroundColor: "#E7EBE5",
                  borderRadius: 4,
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, ((profile.badge_score ?? 0) / next.min_score) * 100)}%`,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: next.color,
                  }}
                />
              </View>
              <Text style={styles.muted}>
                Puan tek başına yeterli değil. Aşağıdaki katkı koşullarının
                tamamı sağlanmalı.
              </Text>
            </>
          )}
          {profile.reputation_metrics &&
            profile.reputation_metrics.penalty_points < 0 && (
              <Text style={{ fontSize: 12, color: colors.red }}>
                İncelenen ihlallerden puan etkisi:{" "}
                {profile.reputation_metrics.penalty_points}
              </Text>
            )}
          {profile.role === "admin" && !profile.member_number && (
            <Text style={styles.muted}>
              Yeni rozet kuralları için topluluk veritabanı güncellemesini
              tamamla.
            </Text>
          )}
        </View>
      )}
      <Text style={styles.heading}>Topluluk seviyeleri</Text>
      <View style={{ gap: 10 }}>
        {levels?.map((level) => (
          <Pressable
            key={level.id}
            accessibilityRole="button"
            accessibilityLabel={`${level.name} koşulları`}
            onPress={() => setSelected(level)}
            style={[
              styles.card,
              { flexDirection: "row", alignItems: "center", padding: 16 },
            ]}
          >
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 15,
                backgroundColor: `${level.color}15`,
              }}
            >
              <Ionicons
                name={level.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={level.color}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.pillText}>
                {level.name}
                {rank === level.rank ? " · Şu anki seviyen" : ""}
              </Text>
              <Text style={styles.muted}>
                {level.min_score.toLocaleString("tr-TR")} puan ·{" "}
                {level.min_countries} ülke · {level.min_experiences} deneyim
              </Text>
            </View>
            <Ionicons
              name={rank >= level.rank ? "checkmark-circle" : "chevron-forward"}
              size={20}
              color={rank >= level.rank ? level.color : colors.muted}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.heading}>Yol boyunca kazandıkların</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {achievementDefinitions.map((a) => {
          const has = earned.data?.includes(a.id);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={`${a.name}${has ? ", kazanıldı" : ""}`}
              onPress={() => setAchievement(a)}
              style={[
                styles.card,
                {
                  width: "47%",
                  flexGrow: 1,
                  padding: 16,
                  alignItems: "center",
                  gap: 9,
                  backgroundColor: has ? "#EEF3E8" : "#FFF",
                },
              ]}
            >
              <Ionicons
                name={a.icon}
                size={30}
                color={has ? colors.blue : "#9AA6AA"}
              />
              <Text style={styles.pillText}>{a.name}</Text>
              <Text
                style={{
                  fontSize: 10,
                  color: has ? colors.blue : colors.muted,
                }}
              >
                {has ? "KAZANILDI" : "KOŞULLARI GÖR"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Güven nasıl oluşuyor?</Text>
        <Text style={styles.muted}>
          Onaylı deneyimler, farklı Schengen ülkeleri ve başkalarının faydalı
          bulduğu yorumlar birlikte değerlendirilir. Bir oy, rozet hesabında
          ancak en az 7 günlük ve onaylı katkısı olan bir üyeden geliyorsa
          nitelikli sayılır. Destekçi sayısı farklı üyelerden oluşur. Kendi
          oyların ve örnek içerikler sayılmaz.
        </Text>
        <Text style={styles.muted}>
          Deneyim, yorum ve oy puanları sınırlıdır; yalnız çok yorum yazarak en
          üst seviyeye çıkılmaz. Bildirimler önce incelenir; doğrulanmış
          ihlaller puanı ve seviyeyi düşürebilir. Rozetler resmî vize uzmanlığı
          veya temsilcilik unvanı değildir.
        </Text>
      </View>
      {!profile && (
        <Button
          label="Topluluğa katıl"
          onPress={() => router.push("/auth?mode=signup")}
        />
      )}
      <Sheet
        visible={!!selected}
        title={selected?.name ?? "Seviye"}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <Text style={styles.heading}>
              {selected.min_score.toLocaleString("tr-TR")} rozet puanı
            </Text>
            <Text style={styles.muted}>
              Aşağıdaki koşulların tamamı birlikte aranır.
            </Text>
            {criteria(selected, profile?.reputation_metrics).map((c) => (
              <View
                key={c.label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Text style={[styles.text, { flex: 1 }]}>{c.label}</Text>
                <Text
                  style={{
                    fontWeight: "700",
                    color:
                      profile && c.current >= c.required
                        ? colors.green
                        : colors.muted,
                  }}
                >
                  {profile ? `${c.current} / ` : ""}
                  {c.required}
                </Text>
              </View>
            ))}
          </>
        )}
      </Sheet>
      <Sheet
        visible={!!achievement}
        title={achievement?.name ?? "Rozet"}
        onClose={() => setAchievement(null)}
      >
        <Text style={styles.text}>{achievement?.description}</Text>
      </Sheet>
    </ScrollView>
  );
}
