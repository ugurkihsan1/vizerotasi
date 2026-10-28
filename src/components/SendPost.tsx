import { useState, useRef, useEffect } from "react";
import {
  Pressable,
  Text,
  Share,
  Platform,
  TextInput,
  View,
} from "react-native";
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
import { searchWords } from "../lib/search";
import type { Post } from "../lib/types";
export function SendPost({ post }: { post: Post }) {
  useAppearance();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [error, setError] = useState("");
  const { session } = useAuth(),
    gate = useGate(),
    cache = useQueryClient(),
    inbox = useChatInbox(open);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = inbox;
  // Search all inbox pages, including conversations beyond the first thirty.
  useEffect(() => {
    if (open && search.trim() && hasNextPage && !isFetchingNextPage)
      void fetchNextPage();
  }, [open, search, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const rooms = (inbox.data?.pages.flat() ?? []).filter(
    (r) => r.status === "active" && r.kind !== "community" && !r.closed_at,
  );
  const matches = rooms.filter((r) =>
    searchWords(search).every((word) =>
      r.title.toLocaleLowerCase("tr").includes(word),
    ),
  );
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
          setSearch("");
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
        {session && (
          <View
            style={[
              styles.input,
              { flexDirection: "row", alignItems: "center", gap: 10 },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput
              accessibilityLabel="Göndermek için kişi veya sohbet ara"
              placeholder="Kişi veya sohbet ara"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              style={{ flex: 1, color: colors.text, minHeight: 40 }}
            />
            {!!search && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aramayı temizle"
                onPress={() => setSearch("")}
                style={{ padding: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            )}
          </View>
        )}
        {matches.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.title} sohbetine gönder`}
            disabled={busy}
            onPress={() => void send(r.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              opacity: busy ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={r.kind === "group" ? "people-outline" : "person-outline"}
                size={22}
                color={colors.blue}
              />
            </View>
            <Text
              style={[styles.text, { flex: 1, fontWeight: "600" }]}
              numberOfLines={1}
            >
              {r.title}
            </Text>
            <Ionicons name="send-outline" size={20} color={colors.blue} />
          </Pressable>
        ))}
        {!!search.trim() && !matches.length && !inbox.isFetching && (
          <Text style={styles.muted}>Sohbet bulunamadı.</Text>
        )}
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
