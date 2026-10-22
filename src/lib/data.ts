import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { db, configured } from "./supabase";
import { useAuth } from "./auth";
import type {
  Country,
  Profile,
  Post,
  Comment,
  Notice,
  Document,
  Kind,
} from "./types";
export const PAGE_SIZE = 15;
export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    enabled: configured,
    queryFn: async () => {
      const r = await db().from("countries").select("*").order("name");
      if (r.error) throw r.error;
      return r.data as Country[];
    },
  });
}
export function useProfile(id?: string) {
  return useQuery({
    queryKey: ["public-profile", id],
    enabled: configured && !!id,
    queryFn: async () => {
      const r = await db().from("profiles").select("*").eq("id", id!).single();
      if (r.error) throw r.error;
      return r.data as Profile;
    },
  });
}
export interface FeedFilter {
  country?: string;
  kind?: Kind;
  result?: string;
  search?: string;
  author?: string;
  pending?: boolean;
  saved?: boolean;
  first?: boolean;
  employment?: string;
  city?: string;
}
export function useFeed(filter: FeedFilter = {}, enabled = true) {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ["feed", filter, session?.user.id],
    enabled: configured && enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let ids: string[] | null = null;
      if (filter.saved) {
        const r = await db()
          .from("saved_items")
          .select("post_id")
          .eq("user_id", session!.user.id)
          .not("post_id", "is", null);
        if (r.error) throw r.error;
        ids = r.data.map((x) => x.post_id);
        if (!ids.length) return [];
      }
      let q = db()
        .from("feed")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (ids) q = q.in("id", ids);
      if (filter.country) q = q.eq("country_id", filter.country);
      if (filter.kind) q = q.eq("kind", filter.kind);
      if (filter.result) q = q.eq("result", filter.result);
      if (filter.author) q = q.eq("user_id", filter.author);
      if (filter.pending) q = q.in("status", ["pending", "needs_revision"]);
      else if (!filter.author) q = q.eq("status", "approved");
      if (filter.first) q = q.eq("first_schengen", true);
      if (filter.employment) q = q.eq("employment_status", filter.employment);
      if (filter.city) q = q.eq("city", filter.city);
      if (filter.search)
        q = q.textSearch("title_body", filter.search, {
          type: "websearch",
          config: "simple",
        });
      const r = await q;
      if (r.error) throw r.error;
      return r.data as Post[];
    },
    getNextPageParam: (last, pages) =>
      last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });
}
export function usePost(id: string) {
  return useQuery({
    queryKey: ["post", id],
    enabled: configured && !!id,
    queryFn: async () => {
      const r = await db().from("feed").select("*").eq("id", id).single();
      if (r.error) throw r.error;
      return r.data as Post;
    },
  });
}
export function useComments(id: string) {
  return useQuery({
    queryKey: ["comments", id],
    enabled: configured,
    queryFn: async () => {
      const r = await db()
        .from("comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at")
        .limit(100);
      if (r.error) throw r.error;
      return r.data as Comment[];
    },
  });
}
export function useFollows() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["follows", session?.user.id],
    queryFn: async () => {
      if (!session) {
        const saved = await AsyncStorage.getItem("guest-country-interests");
        return saved ? (JSON.parse(saved) as string[]) : [];
      }
      const r = await db()
        .from("followed_countries")
        .select("country_id")
        .eq("user_id", session.user.id);
      if (r.error) throw r.error;
      return r.data.map((x) => x.country_id) as string[];
    },
  });
}
export function useNotifications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["notifications", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const r = await db()
        .from("notifications")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (r.error) throw r.error;
      return r.data as Notice[];
    },
    refetchInterval: 60000,
  });
}
export function useDocuments(country: string) {
  return useQuery({
    queryKey: ["documents", country],
    enabled: configured,
    queryFn: async () => {
      const r = await db()
        .from("country_documents")
        .select("*")
        .eq("country_id", country)
        .order("category");
      if (r.error) throw r.error;
      return r.data as Document[];
    },
  });
}
export function useToggle(
  table:
    | "helpful_votes"
    | "saved_items"
    | "followed_countries"
    | "comment_helpful_votes",
  column: "post_id" | "country_id" | "document_id" | "comment_id",
  target: string,
) {
  const { session } = useAuth();
  const cache = useQueryClient();
  const queryKey = [table, column, target, session?.user.id];
  const state = useQuery({
    queryKey,
    enabled: !!session,
    queryFn: async () => {
      const r = await db()
        .from(table)
        .select("user_id")
        .eq("user_id", session!.user.id)
        .eq(column, target)
        .maybeSingle();
      if (r.error) throw r.error;
      return !!r.data;
    },
  });
  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!session) throw new Error("Giriş yapmalısın.");
      const r = !next
        ? await db()
            .from(table)
            .delete()
            .eq("user_id", session.user.id)
            .eq(column, target)
        : await db()
            .from(table)
            .insert({ user_id: session.user.id, [column]: target });
      if (r.error) throw r.error;
    },
    onMutate: async () => {
      await cache.cancelQueries({ queryKey });
      const old = state.data;
      cache.setQueryData(queryKey, !old);
      return { old };
    },
    onError: (_e, _v, c) => cache.setQueryData(queryKey, c?.old),
    onSettled: () => {
      cache.invalidateQueries({ queryKey });
      cache.invalidateQueries({ queryKey: ["feed"] });
      cache.invalidateQueries({ queryKey: ["post"] });
      cache.invalidateQueries({ queryKey: ["follows"] });
    },
  });
  return {
    active: state.data ?? false,
    loading: state.isPending,
    pending: mutation.isPending,
    toggle: () => mutation.mutateAsync(!state.data),
  };
}
export function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "23505") return "Bu kullanıcı adı veya kayıt zaten var.";
  if (code === "42501") return "Bu işlem için yetkin bulunmuyor.";
  return "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.";
}
