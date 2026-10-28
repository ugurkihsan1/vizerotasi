import { useAppearance, textSize, themeColor } from "../lib/appearance";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { chatError, useChatRealtime, useChatUnread } from "../lib/chat";
import { useFollows } from "../lib/data";
import { Button, Sheet, Message, styles, colors, useGate } from "./ui";
export function ChatSync() {
  useChatRealtime();
  return null;
}
export function MessagesEntry() {
  useAppearance();

  const q = useChatUnread();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mesajlar${q.data ? ` · ${q.data} okunmamış` : ""}`}
      onPress={() => router.push("/messages")}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
      }}
    >
      <Ionicons name="chatbubbles-outline" size={23} color={colors.navy} />
      {!!q.data && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 2,
            borderRadius: 10,
            backgroundColor: themeColor("#24766C", "surface"),
            minWidth: 18,
            paddingHorizontal: 4,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: textSize(10),
              color: themeColor("#FFF", "text"),
              fontWeight: "700",
            }}
          >
            {q.data > 99 ? "99+" : q.data}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
export function CommunityChatEntry({
  countryId,
  name,
  label = "Topluluk sohbeti",
  children,
}: {
  countryId: string;
  name: string;
  label?: string;
  children?: ReactNode;
}) {
  useAppearance();

  const { session } = useAuth(),
    follows = useFollows(),
    gate = useGate(),
    cache = useQueryClient();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function open(follow = false) {
    setBusy(true);
    setError("");
    try {
      const r = await db().rpc("chat_open_community", {
        target_country: countryId,
        follow_country: follow,
      });
      if (r.error) throw r.error;
      setConfirm(false);
      void cache.invalidateQueries({ queryKey: ["follows"] });
      void cache.invalidateQueries({ queryKey: ["chat"] });
      router.push(`/chat/${r.data}`);
    } catch (e) {
      setError(chatError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      {children ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={busy}
          onPress={() =>
            gate.require(() => {
              if (session && follows.data?.includes(countryId)) void open();
              else setConfirm(true);
            })
          }
          style={{
            alignItems: "center",
            gap: 6,
            minWidth: 64,
            opacity: busy ? 0.5 : 1,
          }}
        >
          {children}
        </Pressable>
      ) : (
        <Button
          secondary
          disabled={busy}
          label={label}
          onPress={() =>
            gate.require(() => {
              if (session && follows.data?.includes(countryId)) void open();
              else setConfirm(true);
            })
          }
        />
      )}
      <Message text={error} />
      {gate.view}
      <Sheet
        title={`${name} topluluk sohbeti`}
        visible={confirm}
        onClose={() => setConfirm(false)}
      >
        <Text style={styles.text}>
          Bu odada {name} topluluğunu takip eden üyeler mesajlaşır. Katılınca
          ülkeyi takip edeceksin. Mesajlarını odanın diğer katılımcıları
          görebilir.
        </Text>
        <Button
          label="Takip et ve sohbeti aç"
          disabled={busy}
          onPress={() => void open(true)}
        />
        <Message text={error} />
      </Sheet>
    </View>
  );
}

export function ProfileMessagesButton() {
  useAppearance();
  const unread = useChatUnread();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mesajlarım"
      accessibilityHint={
        unread.data ? `${unread.data} okunmamış mesaj` : undefined
      }
      onPress={() => router.push("/messages")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themeColor("#E4E4E4", "border"),
        backgroundColor: themeColor("#F5F5F5", "surface"),
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={19}
        color={colors.navy}
      />
      <Text
        style={{
          color: colors.navy,
          fontWeight: "600",
          fontSize: textSize(13),
        }}
      >
        Mesajlarım
      </Text>
      {!!unread.data && (
        <View
          style={{
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            paddingHorizontal: 5,
            backgroundColor: colors.navy,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.bg,
              fontSize: textSize(10),
              fontWeight: "700",
            }}
          >
            {unread.data > 99 ? "99+" : unread.data}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
