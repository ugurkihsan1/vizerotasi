import type { SupabaseClient } from "@supabase/supabase-js";

export async function markNotificationsRead(
  client: SupabaseClient,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return [] as { id: string; read_at: string }[];
  const result = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", [...new Set(ids)])
    .is("read_at", null)
    .select("id,read_at");
  if (result.error) throw result.error;
  return result.data as { id: string; read_at: string }[];
}
