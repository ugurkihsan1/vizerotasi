import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { db, configured } from "../../src/lib/supabase";
import type { Profile } from "../../src/lib/types";
import { ProfileScreen } from "../../src/screens/ProfileScreen";
import { Busy, Empty } from "../../src/components/ui";
export default function PublicProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const q = useQuery({
    queryKey: ["username", username],
    enabled: configured,
    queryFn: async () => {
      const r = await db()
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      if (r.error) throw r.error;
      return r.data as Profile;
    },
  });
  if (configured && q.isPending) return <Busy />;
  if (!q.data) return <Empty title="Bu profil bulunamadı" />;
  return <ProfileScreen profile={q.data} />;
}
