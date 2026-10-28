import { useEffect } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
/** One user-scoped subscription for the badge and notifications list. */
export function NotificationSync() {
  const { session } = useAuth();
  const cache = useQueryClient();
  const user = session?.user.id;
  useEffect(() => {
    if (!user) return;
    let channel: ReturnType<ReturnType<typeof db>["channel"]> | undefined;
    const refresh = () => {
      void cache.invalidateQueries(
        { queryKey: ["notifications", user] },
        { cancelRefetch: false },
      );
    };
    const connect = () => {
      if (
        channel ||
        AppState.currentState === "background" ||
        AppState.currentState === "inactive"
      )
        return;
      channel = db()
        .channel(`notifications-${user}`)
        .on(
          "postgres_changes",
          {
            schema: "public",
            table: "notifications",
            event: "*",
            filter: `user_id=eq.${user}`,
          },
          refresh,
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") refresh();
        });
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
  }, [cache, user]);
  return null;
}
