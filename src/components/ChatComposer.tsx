import { useAppearance } from "../lib/appearance";
import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { containsAllWords } from "../lib/search";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { Avatar } from "./PostCard";
import { Field, Button, styles } from "./ui";
export function ChatPeoplePicker({
  selected,
  onChange,
  disabled = false,
  max = 9,
}: {
  selected: Profile[];
  onChange: (people: Profile[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  useAppearance();

  const { session } = useAuth();
  const [text, setText] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const q = useQuery({
    queryKey: ["chat", "people", session?.user.id, search],
    enabled: !!session && search.length >= 2,
    queryFn: async () => {
      const r = await db()
        .from("profiles")
        .select("*")
        .neq("id", session!.user.id)
        .or(
          containsAllWords(search, ["username", "display_name"]) ??
            "username.eq.__no_match__",
        )
        .order("username")
        .limit(15);
      if (r.error) throw r.error;
      return r.data as Profile[];
    },
  });
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Kişi ara"
        placeholder="Kullanıcı adı veya ad · en az 2 karakter"
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        maxLength={60}
      />
      {selected.map((p) => (
        <Button
          key={p.id}
          secondary
          disabled={disabled}
          label={`@${p.username} · seçimi kaldır`}
          onPress={() => onChange(selected.filter((x) => x.id !== p.id))}
        />
      ))}
      <Text style={styles.muted}>
        {selected.length} kişi seçildi · En fazla {max}
      </Text>
      {search.length >= 2 && q.isPending && (
        <Text style={styles.muted}>Kişiler aranıyor…</Text>
      )}
      {q.isError && <Text style={styles.muted}>Kişiler yüklenemedi.</Text>}
      {q.data?.map((p) => {
        const chosen = selected.some((x) => x.id === p.id);
        return (
          <Pressable
            key={p.id}
            accessibilityRole="checkbox"
            accessibilityLabel={`@${p.username}`}
            accessibilityState={{ checked: chosen }}
            disabled={disabled || (!chosen && selected.length >= max)}
            onPress={() =>
              onChange(
                chosen
                  ? selected.filter((x) => x.id !== p.id)
                  : [...selected, p],
              )
            }
            style={{
              minHeight: 54,
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Avatar name={p.display_name} url={p.avatar_url} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pillText}>{p.display_name}</Text>
              <Text style={styles.muted}>@{p.username}</Text>
            </View>
            <Text style={styles.text}>{chosen ? "✓" : "+"}</Text>
          </Pressable>
        );
      })}
      {search.length >= 2 && q.isSuccess && !q.data.length && (
        <Text style={styles.muted}>Üye bulunamadı.</Text>
      )}
    </View>
  );
}
