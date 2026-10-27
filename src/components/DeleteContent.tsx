import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { queueCleanup, cleanupEvidence } from "../lib/content-cleanup";
import { useAppearance } from "../lib/appearance";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { db } from "../lib/supabase";
import { styles, Button, Sheet, Message, colors } from "./ui";
import { Text, Pressable } from "react-native";
export function DeleteContent({
  id,
  isComment = false,
}: {
  id: string;
  isComment?: boolean;
}) {
  useAppearance();

  const { session } = useAuth();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    cache = useQueryClient();
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // Collect only the owner's private attachments before their metadata cascades away.
      let paths: string[] = [];
      if (!isComment) {
        const e = await db()
          .from("post_evidence")
          .select("storage_path")
          .eq("post_id", id);
        if (e.error && !["42P01", "PGRST205"].includes(e.error.code))
          throw e.error;
        paths = (e.data ?? []).map((f) => f.storage_path);
      }
      const r = await db().rpc("delete_own_content", {
        target: id,
        is_comment: isComment,
      });
      if (r.error) throw r.error;
      if (paths.length && session) {
        await queueCleanup(session.user.id, paths);
        try {
          await cleanupEvidence(session.user.id);
        } catch {
          /* The owner can retry the persisted cleanup from Settings. */
        }
      }
      await cache.invalidateQueries();
      setOpen(false);
      if (!isComment) router.replace("/profile");
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === "PGRST202"
          ? "Silme özelliği için veritabanı güncellemesi gerekiyor."
          : "Silinemedi. Yeniden deneyebilirsin.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {isComment ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yorumu sil"
          onPress={() => setOpen(true)}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="trash-outline" size={19} color={colors.muted} />
        </Pressable>
      ) : (
        <Button secondary label="Paylaşımı sil" onPress={() => setOpen(true)} />
      )}
      <Sheet
        visible={open}
        onClose={() => !busy && setOpen(false)}
        title={isComment ? "Yorumu sil" : "Paylaşımı sil"}
      >
        <Text style={styles.text}>
          Bu içerik ve altındaki yanıtlar kalıcı olarak silinecek.
        </Text>
        <Message text={error} />
        <Button
          label="Silmeyi onayla"
          disabled={busy}
          onPress={() => void remove()}
        />
      </Sheet>
    </>
  );
}
