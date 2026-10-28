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
  compact = false,
  redirect = true,
}: {
  id: string;
  isComment?: boolean;
  compact?: boolean;
  redirect?: boolean;
}) {
  useAppearance();

  const { session } = useAuth();
  const [menu, setMenu] = useState(false);
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
        try {
          await queueCleanup(session.user.id, paths);
          await cleanupEvidence(session.user.id);
        } catch {
          /* The owner can retry the persisted cleanup from Settings. */
        }
      }
      await cache.invalidateQueries();
      setOpen(false);
      if (!isComment && redirect) router.replace("/profile");
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
      {isComment || compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isComment ? "Yorum seçenekleri" : "Paylaşım seçenekleri"
          }
          onPress={() => setMenu(true)}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} />
        </Pressable>
      ) : (
        <Button secondary label="Paylaşımı sil" onPress={() => setMenu(true)} />
      )}
      <Sheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={isComment ? "Yorum seçenekleri" : "Paylaşım seçenekleri"}
      >
        <Button
          secondary
          label={isComment ? "Yorumu sil" : "Paylaşımı sil"}
          onPress={() => {
            setMenu(false);
            setOpen(true);
          }}
        />
      </Sheet>
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
