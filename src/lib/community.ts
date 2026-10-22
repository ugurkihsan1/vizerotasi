import { useQuery } from "@tanstack/react-query";
import { db, configured } from "./supabase";
import definitions from "../content/community-levels.json";
export type MembershipLevel = (typeof definitions)[number];
export interface ProgressMetrics {
  approved_experiences: number;
  approved_comments: number;
  approved_questions: number;
  experience_countries: number;
  appointment_posts: number;
  welcomed_members: number;
  qualified_comment_votes: number;
  liked_comments: number;
  unique_supporters: number;
  qualified_post_votes: number;
  account_days: number;
  penalty_points: number;
  level_rank: number;
}
export const achievementDefinitions = [
  {
    id: "europe-conqueror",
    name: "Avrupa Fatihi",
    icon: "earth-outline",
    description: "5 farklı Schengen ülkesinden onaylı deneyim paylaş.",
  },
  {
    id: "travel-companion",
    name: "Yol Arkadaşı",
    icon: "people-outline",
    description: "İlk 30 günündeki 3 farklı üyeye onaylı yorumlarla destek ol.",
  },
  {
    id: "appointment-detective",
    name: "Dedektif",
    icon: "search-outline",
    description: "Randevu kategorisinde 3 onaylı bilgi veya deneyim paylaş.",
  },
  {
    id: "pioneer-member",
    name: "Öncü Üye",
    icon: "flag-outline",
    description: "Kayıt sırasındaki ilk 1000 üyeden biri ol.",
  },
] as const;
export function useMembershipLevels() {
  return useQuery({
    queryKey: ["membership-levels"],
    enabled: configured,
    queryFn: async () => {
      const r = await db().from("membership_levels").select("*").order("rank");
      if (r.error) {
        if (r.error.code === "PGRST205" || r.error.code === "42P01")
          return definitions;
        throw r.error;
      }
      return r.data as MembershipLevel[];
    },
    staleTime: 300000,
  });
}
export const levelDefinitions = definitions;
export function criteria(
  level: MembershipLevel,
  metrics?: Partial<ProgressMetrics>,
) {
  return [
    {
      label: "Onaylı deneyim",
      current: metrics?.approved_experiences ?? 0,
      required: level.min_experiences,
    },
    {
      label: "Farklı Schengen ülkesi",
      current: metrics?.experience_countries ?? 0,
      required: level.min_countries,
    },
    {
      label: "Onaylı yorum",
      current: metrics?.approved_comments ?? 0,
      required: level.min_comments,
    },
    {
      label: "Faydalı bulunan farklı yorum",
      current: metrics?.liked_comments ?? 0,
      required: level.min_liked_comments,
    },
    {
      label: "Yorumlara nitelikli faydalı oyu",
      current: metrics?.qualified_comment_votes ?? 0,
      required: level.min_comment_votes,
    },
    {
      label: "Farklı destekleyen üye",
      current: metrics?.unique_supporters ?? 0,
      required: level.min_supporters,
    },
    {
      label: "Üyelik günü",
      current: metrics?.account_days ?? 0,
      required: level.min_account_days,
    },
  ].filter((c) => c.required > 0);
}
