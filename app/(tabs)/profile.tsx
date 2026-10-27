import { useAppearance } from "../../src/lib/appearance";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { ProfileScreen } from "../../src/screens/ProfileScreen";
import { Empty, styles, Busy } from "../../src/components/ui";
export default function Profile() {
  useAppearance();

  const { profile, session, loading } = useAuth();
  if (loading) return <Busy />;
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Senin rotan, senin topluluğun"
          body="Deneyimlerini paylaşmak ve kaydettiklerine dönmek için hesabını oluştur."
          action="Üye ol"
          onPress={() => router.push("/auth?mode=signup")}
        />
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/auth")}
          style={{
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={styles.muted}>Zaten hesabın var mı? Giriş yap</Text>
        </Pressable>
      </View>
    );
  if (!profile)
    return (
      <Empty
        title="Profil yüklenemedi"
        body="Bağlantını kontrol edip yeniden giriş yapabilirsin."
      />
    );
  return <ProfileScreen profile={profile} own />;
}
