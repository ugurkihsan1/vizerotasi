import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useQuery } from "@tanstack/react-query";
import { db, configured } from "./supabase";
export type EvidenceDraft = DocumentPicker.DocumentPickerAsset;
export interface EvidenceFile {
  id: string;
  post_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}
export interface Verification {
  post_id: string;
  status: "pending" | "verified" | "declined";
  verified_at: string | null;
}
export const EVIDENCE_LIMIT = 5,
  EVIDENCE_MAX_BYTES = 8388608;
export async function chooseEvidence(
  remaining: number,
): Promise<EvidenceDraft[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  if (result.assets.length > remaining)
    throw new Error(`En fazla ${remaining} belge daha seçebilirsin.`);
  for (const f of result.assets)
    if (
      !f.size ||
      f.size > EVIDENCE_MAX_BYTES ||
      !["application/pdf", "image/jpeg", "image/png"].includes(f.mimeType ?? "")
    )
      throw new Error("Her belge PDF, JPG veya PNG ve en fazla 8 MB olmalı.");
  return result.assets;
}
export async function uploadEvidence(
  file: EvidenceDraft,
  user: string,
  post: string,
) {
  const bytes =
    Platform.OS === "web" && file.file
      ? await file.file.arrayBuffer()
      : await new File(file.uri).arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > EVIDENCE_MAX_BYTES)
    throw new Error("Belge en fazla 8 MB olmalı.");
  const mime = file.mimeType!;
  const signature = new Uint8Array(bytes).slice(0, 5);
  const valid =
    mime === "application/pdf"
      ? String.fromCharCode(...signature) === "%PDF-"
      : mime === "image/jpeg"
        ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255
        : mime === "image/png" &&
          signature[0] === 137 &&
          signature[1] === 80 &&
          signature[2] === 78 &&
          signature[3] === 71;
  if (!valid)
    throw new Error("Belgenin biçimi okunamadı. PDF, JPG veya PNG seç.");
  const ext =
    mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const path = `${user}/${post}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const r = await db()
    .storage.from("post-evidence")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (r.error) throw r.error;
  const registered = await db().rpc("register_post_evidence", {
    target: post,
    path,
    original_name: file.name,
  });
  if (registered.error) {
    await db().storage.from("post-evidence").remove([path]);
    throw registered.error;
  }
}
export function useVerification(id: string) {
  return useQuery({
    queryKey: ["post-verification", id],
    enabled: configured && !!id,
    queryFn: async () => {
      const r = await db()
        .from("post_verifications")
        .select("post_id,status,verified_at")
        .eq("post_id", id)
        .maybeSingle();
      // Older databases continue to display an unverified community account.
      if (r.error && ["42P01", "PGRST205"].includes(r.error.code)) return null;
      if (r.error) throw r.error;
      return r.data as Verification | null;
    },
  });
}
export function useEvidence(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["post-evidence", id],
    enabled: enabled && !!id,
    queryFn: async () => {
      const r = await db()
        .from("post_evidence")
        .select("*")
        .eq("post_id", id)
        .order("created_at");
      if (r.error) throw r.error;
      return r.data as EvidenceFile[];
    },
  });
}
