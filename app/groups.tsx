import { useState } from "react";
import { FlatList, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../src/lib/auth";
import { useGroups, groupError } from "../src/lib/groups";
import { db } from "../src/lib/supabase";
import {
  styles,
  colors,
  Field,
  Button,
  Sheet,
  Message,
  Busy,
  Chip,
} from "../src/components/ui";
export default function Groups() {
  const { session } = useAuth();
  return <GroupDirectory key={session?.user.id ?? "guest"} />;
}
function GroupDirectory() {
  const q = useGroups(),
    cache = useQueryClient(),
    { session } = useAuth();
  const [search, setSearch] = useState(""),
    [mine, setMine] = useState(false),
    [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function create() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await db().rpc("sharing_create", {
        group_name: name.trim(),
        group_description: description.trim(),
      });
      if (r.error) throw r.error;
      await cache.invalidateQueries({ queryKey: ["groups"] });
      setOpen(false);
      router.push(`/group/${r.data}`);
    } catch (e) {
      setError(groupError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Grup oluştur"
              onPress={() => (session ? setOpen(true) : router.push("/auth"))}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: colors.blue,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={25} color="#FFF" />
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={styles.page}
        contentContainerStyle={styles.content}
        data={(q.data ?? []).filter(
          (g) =>
            (!mine ||
              g.my_status === "active" ||
              g.my_status === "pending" ||
              g.is_manager) &&
            g.name
              .toLocaleLowerCase("tr-TR")
              .includes(search.toLocaleLowerCase("tr-TR")),
        )}
        keyExtractor={(g) => g.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 8 }}>
            <Field
              label="Grup ara"
              placeholder="Erasmus, öğrenciler…"
              value={search}
              onChangeText={setSearch}
              maxLength={60}
            />
            <View style={styles.row}>
              <Chip
                label="Keşfet"
                active={!mine}
                onPress={() => setMine(false)}
              />
              <Chip
                label="Gruplarım"
                active={mine}
                onPress={() => setMine(true)}
              />
            </View>
          </View>
        }
        renderItem={({ item: g }) => (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${g.name} grubunu aç`}
            onPress={() => router.push(`/group/${g.id}`)}
            style={[
              styles.card,
              {
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              },
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: g.is_system ? "#EDE8F8" : "#EAF0ED",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={g.is_system ? "school-outline" : "people-outline"}
                size={26}
                color={g.is_system ? "#71579D" : colors.blue}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.heading}>{g.name}</Text>
              <Text style={styles.muted}>
                {g.member_count} üye ·{" "}
                {g.is_manager
                  ? "Yönetici"
                  : g.my_status === "active"
                    ? "Üyesin"
                    : g.my_status === "pending"
                      ? "Onay bekleniyor"
                      : "Yönetici onaylı"}
              </Text>
              {g.request_count > 0 && (
                <Text style={{ color: colors.amber, fontSize: 12 }}>
                  {g.request_count} katılım isteği
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
        ListEmptyComponent={
          q.isPending ? (
            <Busy />
          ) : q.isError ? (
            <View style={styles.card}>
              <Text style={styles.muted}>{groupError(q.error)}</Text>
              <Button
                secondary
                label="Yeniden dene"
                onPress={() => void q.refetch()}
              />
            </View>
          ) : (
            <Text style={styles.muted}>
              {mine ? "Henüz bir gruba katılmadın." : "Grup bulunamadı."}
            </Text>
          )
        }
      />
      <Sheet
        visible={open}
        onClose={() => !busy && setOpen(false)}
        title="Grup oluştur"
      >
        <Field
          label="Grup adı"
          value={name}
          onChangeText={setName}
          maxLength={60}
          placeholder="Örn. Erasmus Almanya"
        />
        <Field
          label="Kısa açıklama"
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          multiline
          placeholder="Bu grupta neler konuşulacak?"
        />
        <Text style={styles.muted}>
          Katılım isteklerini sen onaylarsın. Paylaşımları yalnız onaylı üyeler
          görür.
        </Text>
        <Message text={error} />
        <Button
          label="Grubu oluştur"
          disabled={busy || name.trim().length < 2}
          onPress={() => void create()}
        />
      </Sheet>
    </>
  );
}
