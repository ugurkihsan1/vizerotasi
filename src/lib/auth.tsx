import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, db } from "./supabase";
import type { Profile } from "./types";
const Context = createContext<{
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}>({ session: null, profile: null, loading: true });
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const cache = useQueryClient();
  const lastUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
        const nextId = next?.user.id ?? null;
        if (lastUser.current !== undefined && lastUser.current !== nextId)
          cache.clear();
        lastUser.current = nextId;
      }
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [cache]);
  const profile = useQuery({
    queryKey: ["profile", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("profiles")
        .select("*")
        .eq("id", session!.user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
  return (
    <Context.Provider
      value={{ session, profile: profile.data ?? null, loading }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
