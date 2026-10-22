import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { ProfileScreen } from "../../src/screens/ProfileScreen";
import { Empty, styles, Busy } from "../../src/components/ui";
export default function Profile() {
  const { profile, session, loading } = useAuth();
  if (loading) return <Busy />;
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Senin rotan, senin topluluğun"
          action="Giriş yap / Üye ol"
          onPress={() => router.push("/auth")}
        />
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
