import { useQuery } from "@tanstack/react-query";
import { db, configured } from "./supabase";
export interface DocumentNote {
  id: string;
  country_id: string;
  document_id: string | null;
  document_key: string | null;
  document_title: string;
  title: string;
  body: string;
  scope: string;
  source_type: "experience" | "editorial";
  post_id: string | null;
  created_by: string;
  source_user_id: string | null;
  status: string;
  similar_count: number;
}
export function useDocumentNotes(country: string) {
  return useQuery({
    queryKey: ["document-notes", country],
    enabled: configured,
    queryFn: async () => {
      const r = await db()
        .from("document_note_feed")
        .select("*")
        .eq("country_id", country)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);
      if (r.error) {
        if (["PGRST205", "42P01"].includes(r.error.code)) return [];
        throw r.error;
      }
      return r.data as DocumentNote[];
    },
    retry: 1,
    staleTime: 60000,
  });
}
