import { useAppearance, textSize, themeColor } from "../lib/appearance";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { styles, colors } from "./ui";
import { Avatar } from "./PostCard";
export function HomeWelcome() {
  useAppearance();

  const { profile, session } = useAuth();
  if (!session) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[styles.title, { fontSize: textSize(25) }]}>
          {profile
            ? `Merhaba, ${profile.display_name.split(" ")[0]} 👋`
            : "Akış"}
        </Text>
      </View>
      {session && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Profilime git"
          onPress={() => router.push("/profile")}
        >
          <Avatar
            name={profile?.display_name ?? "Üye"}
            url={profile?.avatar_url}
          />
        </Pressable>
      )}
    </View>
  );
}
export function OwnSubmissionNotice() {
  useAppearance();

  const { session, profile } = useAuth();
  const q = useQuery({
    queryKey: ["own-submission-notice", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const r = await db()
        .from("posts")
        .select("id,title,status")
        .eq("user_id", session!.user.id)
        .in("status", ["pending", "needs_revision"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (r.error) throw r.error;
      return (r.data[0] ?? null) as
        { id: string; title: string; status: string } | undefined;
    },
    refetchInterval: 30000,
  });
  if (!q.data) return null;
  const staff = profile?.role === "admin" || profile?.role === "moderator";
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={
        staff ? "Gönderini moderasyonda incele" : "İncelemedeki gönderini gör"
      }
      onPress={() => router.push(staff ? "/moderation" : "/profile")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 15,
        borderRadius: 18,
        backgroundColor: themeColor("#FFF2DA", "surface"),
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: themeColor("#F7E4BF", "surface"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="time-outline"
          size={21}
          color={themeColor("#986D29", "text")}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: textSize(13),
            fontWeight: "700",
            color: themeColor("#805C24", "text"),
          }}
        >
          {q.data.status === "needs_revision"
            ? "Gönderin için düzenleme istendi"
            : "Paylaşımın incelemede"}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: textSize(12),
            color: themeColor("#947741", "text"),
          }}
        >
          {q.data.title}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={themeColor("#986D29", "text")}
      />
    </Pressable>
  );
}
export function CommunityNote() {
  useAppearance();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 4,
        paddingVertical: 12,
        alignItems: "flex-start",
      }}
    >
      <Ionicons name="shield-checkmark-outline" size={19} color={colors.blue} />
      <Text
        style={[
          styles.muted,
          { flex: 1, fontSize: textSize(12), lineHeight: 19 },
        ]}
      >
        Topluluk deneyimleri resmî bilgi değildir.
      </Text>
    </View>
  );
}
export function CommunityEmpty() {
  useAppearance();

  const { session } = useAuth();
  return (
    <View style={[styles.card, { padding: 18, gap: 12 }]}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: themeColor("#E7EFEB", "surface"),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.blue} />
        </View>
        <Text style={[styles.heading, { fontSize: textSize(16), flex: 1 }]}>
          Henüz paylaşım yok
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={session ? "Deneyimini paylaş" : "Topluluğa katıl"}
        onPress={() => router.push(session ? "/create" : "/auth?mode=signup")}
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: themeColor("#EDF0EB", "border"),
          paddingTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: textSize(13),
            fontWeight: "700",
            color: colors.blue,
          }}
        >
          {session ? "Deneyimini paylaş" : "Topluluğa katıl"}
        </Text>
        <Ionicons name="arrow-forward" size={19} color={colors.blue} />
      </Pressable>
    </View>
  );
}
