import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { db, configured } from "./supabase";
export interface SocialProfile {
  is_private: boolean;
  can_view: boolean;
  followers: number;
  following: number;
  relationship: "pending" | "accepted" | null;
}
export function useSocialProfile(id?: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["social", session?.user.id, id],
    enabled: configured && !!id,
    retry: false,
    queryFn: async () => {
      const r = await db().rpc("social_profile", { target: id });
      if (r.error) throw r.error;
      return r.data as SocialProfile | null;
    },
    refetchInterval: 15000,
  });
}
export function useFollowAction() {
  const cache = useQueryClient();
  return async (target: string, action: string) => {
    const r = await db().rpc("social_follow", { target, action });
    if (r.error) throw r.error;
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["social"] }),
      cache.invalidateQueries({ queryKey: ["social-list"] }),
      cache.invalidateQueries({ queryKey: ["feed"] }),
      cache.invalidateQueries({ queryKey: ["post"] }),
      cache.invalidateQueries({ queryKey: ["document-notes"] }),
      cache.invalidateQueries({ queryKey: ["guide-community-tips"] }),
    ]);
  };
}
