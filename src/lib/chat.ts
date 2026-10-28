import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "./auth";
import { db } from "./supabase";
export interface ChatRoom {
  id: string;
  kind: "community" | "direct" | "group";
  country_id: string | null;
  title: string;
  created_by: string | null;
  closed_at: string | null;
}
export interface ChatMember {
  user_id: string;
  status: "active" | "invited" | "declined" | "left";
  invited_by: string | null;
  last_read_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}
export interface ChatMessage {
  shared_post_id?: string | null;
  image_path?: string | null;
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  hidden_at: string | null;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}
export interface InboxRoom extends ChatRoom {
  status: "active" | "invited";
  last_at: string;
  last_body: string | null;
  unread_count: number;
}
export function chatError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (["PGRST202", "PGRST205", "42P01"].includes(e?.code ?? ""))
    return "Sohbet henüz etkin değil. Yönetimin sohbet güncellemesini uygulaması gerekiyor.";
  if (e?.message?.includes("rate limit"))
    return "Çok hızlı işlem yaptın. Biraz bekleyip yeniden dene.";
  if (e?.message?.includes("Wait for"))
    return "Karşı tarafın sohbet isteğini kabul etmesini bekle. Kabulden önce en fazla 3 mesaj gönderebilirsin.";
  if (e?.message?.includes("Maximum 10"))
    return "Bir grupta en fazla 10 kişi olabilir.";
  if (e?.message?.includes("Follow country"))
    return "Topluluk sohbeti için önce ülkeyi takip et.";
  if (e?.message?.includes("Room closed"))
    return "Bu grup kapatılmış; yeni mesaj gönderilemiyor.";
  if (e?.message?.includes("Recipient cannot view"))
    return "Bu özel paylaşımı alıcı henüz göremiyor.";
  if (e?.message?.includes("Accepted unblocked"))
    return "Önce sohbet isteğinin kabul edilmesi gerekiyor.";
  if (e?.code === "42501")
    return "Bu sohbet için erişimin yok veya bu kişiyle mesajlaşma şu anda mümkün değil.";
  return "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.";
}
function useChatActive() {
  const [active, setActive] = useState(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => listener.remove();
  }, []);
  return active;
}
export function useChatInbox(enabled = true) {
  const { session } = useAuth();
  const active = useChatActive();
  return useInfiniteQuery({
    queryKey: ["chat", "inbox", session?.user.id],
    enabled: !!session && enabled && active,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const r = await db().rpc("chat_inbox", {
        page_size: 30,
        page_offset: pageParam,
      });
      if (r.error) throw r.error;
      return r.data as InboxRoom[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 30 ? pages.length * 30 : undefined,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
}
export function useChatUnread() {
  const { session } = useAuth();
  const active = useChatActive();
  return useQuery({
    queryKey: ["chat", "unread", session?.user.id],
    enabled: !!session && active,
    queryFn: async () => {
      const r = await db().rpc("chat_unread_count");
      if (r.error) throw r.error;
      return Number(r.data ?? 0);
    },
    retry: false,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}
export function useChatRoom(id: string, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chat", "room", session?.user.id, id],
    enabled: !!session && !!id && enabled,
    queryFn: async () => {
      const r = await db().from("chat_rooms").select("*").eq("id", id).single();
      if (r.error) throw r.error;
      return r.data as ChatRoom;
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
export function useChatMembers(
  id: string,
  enabled = true,
  kind: ChatRoom["kind"] = "direct",
) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chat", "members", session?.user.id, id, kind],
    enabled: !!session && !!id && enabled,
    queryFn: async () => {
      let query = db()
        .from("chat_members")
        .select(
          "user_id,status,invited_by,last_read_at,profiles!chat_members_user_id_fkey(username,display_name,avatar_url)",
        )
        .eq("room_id", id)
        .order("joined_at");
      if (kind === "community")
        query = query.eq("user_id", session!.user.id).limit(1);
      else if (kind === "group")
        query = query.in("status", ["active", "invited"]).limit(10);
      else query = query.limit(2);
      const r = await query;
      if (r.error) throw r.error;
      return r.data as unknown as ChatMember[];
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
export function useChatMessages(id: string, enabled: boolean) {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ["chat", "messages", session?.user.id, id],
    enabled: !!session && !!id && enabled,
    initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      let q = db()
        .from("chat_messages")
        .select(
          "*,profiles!chat_messages_sender_id_fkey(username,display_name,avatar_url)",
        )
        .eq("room_id", id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(40);
      if (pageParam)
        q = q.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      const r = await q;
      if (r.error) throw r.error;
      return r.data as unknown as ChatMessage[];
    },
    getNextPageParam: (last) =>
      last.length === 40
        ? {
            created_at: last[last.length - 1].created_at,
            id: last[last.length - 1].id,
          }
        : undefined,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
/** INSERT/UPDATE only: Postgres RLS checks each recipient. No private message cache on disk. */
export function useChatRealtime(id?: string, enabled = true) {
  const { session } = useAuth(),
    cache = useQueryClient();
  useEffect(() => {
    if (!session || !enabled) return;
    let channel: ReturnType<ReturnType<typeof db>["channel"]> | undefined;
    const refresh = () => {
      void cache.invalidateQueries({ queryKey: ["chat"] });
    };
    const connect = () => {
      if (
        channel ||
        AppState.currentState === "background" ||
        AppState.currentState === "inactive"
      )
        return;
      const filter = {
        schema: "public",
        table: "chat_messages",
        ...(id ? { filter: `room_id=eq.${id}` } : {}),
      };
      channel = db()
        .channel(`chat-${session.user.id}-${id ?? "inbox"}`)
        .on("postgres_changes", { ...filter, event: "INSERT" }, refresh)
        .on("postgres_changes", { ...filter, event: "UPDATE" }, refresh)
        .subscribe();
    };
    const disconnect = () => {
      if (channel) {
        void db().removeChannel(channel);
        channel = undefined;
      }
    };
    connect();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        connect();
        refresh();
      } else disconnect();
    });
    return () => {
      listener.remove();
      disconnect();
    };
  }, [session?.user.id, session, cache, id, enabled]);
}
