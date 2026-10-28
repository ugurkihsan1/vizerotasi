import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { db } from "./supabase";
import type {
  BuddyPlanRow,
  BuddyFilters,
  ApplicationBuddy,
} from "./application-buddies";
export function useOwnBuddyPlan(country: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["application-buddies", session?.user.id, country, "own"],
    enabled: !!session && !!country,
    queryFn: async () => {
      const r = await db()
        .from("application_buddy_plans")
        .select(
          "user_id,country_id,application_city,destination_city,application_month,purpose,stage",
        )
        .eq("user_id", session!.user.id)
        .eq("country_id", country)
        .maybeSingle();
      if (r.error) throw r.error;
      return r.data as BuddyPlanRow | null;
    },
    retry: false,
  });
}
export function useApplicationBuddies(country: string, filters: BuddyFilters) {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: [
      "application-buddies",
      session?.user.id,
      country,
      "list",
      filters,
    ],
    enabled: !!session && !!country,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db().rpc("find_application_buddies", {
        target_country: country,
        filter_city: filters.city.trim() || null,
        filter_destination: filters.destination.trim() || null,
        filter_month: filters.period ? filters.period + "-01" : null,
        page_size: 20,
        page_offset: pageParam,
      });
      if (r.error) throw r.error;
      return r.data as ApplicationBuddy[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
    retry: false,
    refetchOnMount: "always",
  });
}
