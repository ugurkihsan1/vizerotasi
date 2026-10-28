import { useState, useRef } from "react";
import { Pressable, Text, Share, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useChatInbox, chatError } from "../lib/chat";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { webPath } from "../lib/web-path";
import { useAppearance } from "../lib/appearance";
import { Button, Sheet, Message, styles, colors, useGate } from "./ui";
import type { Post } from "../lib/types";
export function SendPost({ post }: { post: Post }) {
  useAppearance();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { session } = useAuth(),
    gate = useGate(),
    cache = useQueryClient(),
    inbox = useChatInbox(open);
  const path = `/${post.kind === "experience" ? "experience" : post.kind === "question" ? "question" : "tip"}/${post.id}`;
  const link =
    Platform.OS === "web"
      ? `${window.location.origin}${webPath(path)}`
      : `https://ugurkihsan1.github.io/vizerotasi${path}`;
  const attempt = useRef<{ room: string; id: string } | null>(null);
  async function send(room: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (attempt.current?.room !== room)
        attempt.current = { room, id: randomUUID() };
      const r = await db().rpc("chat_send_attachment", {
        target: room,
        client_id: attempt.current!.id,
        shared_post: post.id,
      });
      if (r.error) throw r.error;
      attempt.current = null;
      await cache.invalidateQueries({ queryKey: ["chat"] });
      setOpen(false);
      router.push(`/chat/${room}`);
    } catch (e) {
      setError(chatError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Paylaşımı gönder"
        onPress={() => {
          setError("");
          setOpen(true);
        }}
        style={{
          minHeight: 44,
          minWidth: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="arrow-redo-outline" size={21} color={colors.muted} />
      </Pressable>
      <Sheet
        visible={open}
        title="Paylaşımı gönder"
        onClose={() => !busy && setOpen(false)}
      >
        <Text style={styles.pillText}>{post.title}</Text>
        <Button
          secondary
          label="Bağlantıyı paylaş"
          onPress={() => {
            void Share.share({
              message: `${post.title}\n${link}`,
              url: link,
            }).catch(() => setError("Paylaşım açılamadı."));
          }}
        />
        {!session && (
          <Button
            label="Sohbetten göndermek için giriş yap"
            onPress={() => {
              setOpen(false);
              gate.require(() => {});
            }}
          />
        )}
        {inbox.data?.pages
          .flat()
          .filter(
            (r) =>
              r.status === "active" && r.kind !== "community" && !r.closed_at,
          )
          .map((r) => (
            <Button
              key={r.id}
              secondary
              disabled={busy}
              label={r.title}
              onPress={() => void send(r.id)}
            />
          ))}
        {session &&
          !inbox.isPending &&
          !inbox.data?.pages
            .flat()
            .some((r) => r.status === "active" && r.kind !== "community") && (
            <Button
              secondary
              label="Yeni sohbet aç"
              onPress={() => {
                setOpen(false);
                router.push("/messages");
              }}
            />
          )}
        {inbox.hasNextPage && (
          <Button
            secondary
            label="Diğer sohbetler"
            onPress={() => void inbox.fetchNextPage()}
          />
        )}
        <Message text={error} />
      </Sheet>
      {gate.view}
    </>
  );
}
