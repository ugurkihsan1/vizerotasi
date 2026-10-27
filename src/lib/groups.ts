import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { db } from "./supabase";
export const ERASMUS_GROUP = "00000000-0000-0000-0000-00000000e001";
export interface SharingGroup {
  id: string;
  name: string;
  description: string;
  owner_id: string | null;
  is_system: boolean;
  my_status: "pending" | "active" | "declined" | "left" | "removed" | null;
  is_manager: boolean;
  member_count: number;
  request_count: number;
}
export interface GroupAuthor {
  display_name: string;
  username: string;
  avatar_url: string | null;
}
export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: GroupAuthor;
  like_count: number;
  comment_count: number;
  liked: boolean;
}
export interface GroupMember {
  user_id: string;
  status: string;
  role: string;
  profiles: GroupAuthor;
}
export interface GroupComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: GroupAuthor;
}
export function groupError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (["PGRST202", "PGRST205", "42P01", "42883"].includes(e?.code ?? ""))
    return "Gruplar henüz etkinleştirilmedi. Kurulum tamamlanınca tekrar dene.";
  if (/rate limit/i.test(e?.message ?? ""))
    return "Çok sık işlem yaptın. Biraz sonra yeniden dene.";
  if (/Transfer ownership/i.test(e?.message ?? ""))
    return "Ayrılmadan önce grup sahipliğini başka bir üyeye devret.";
  if (e?.code === "42501")
    return "Bu işlem için üyeliğini veya yönetici yetkini kontrol et.";
  return "İşlem tamamlanamadı. Yeniden deneyebilirsin.";
}
export function useGroups() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["groups", session?.user.id ?? "guest", "directory"],
    queryFn: async () => {
      const r = await db().rpc("sharing_directory");
      if (r.error) throw r.error;
      return (r.data ?? []) as SharingGroup[];
    },
  });
}
export function useGroupFeed(id: string, enabled: boolean) {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ["groups", session?.user.id, id, "feed"],
    enabled: enabled && !!session,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db().rpc("sharing_feed", {
        target: id,
        page_offset: pageParam,
      });
      if (r.error) throw r.error;
      return (r.data ?? []) as GroupPost[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
  });
}
export function useSharingGroup(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["groups", session?.user.id ?? "guest", id, "detail"],
    queryFn: async () => {
      const r = await db().rpc("sharing_directory", { target_group: id });
      if (r.error) throw r.error;
      return ((r.data ?? []) as SharingGroup[])[0] ?? null;
    },
  });
}
