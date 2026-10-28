import {
  useApplicationBuddies,
  useOwnBuddyPlan,
} from "../lib/application-buddies-data";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState, type ReactNode } from "react";
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { chatError } from "../lib/chat";
import { db } from "../lib/supabase";
import { textSize, themeColor, useAppearance } from "../lib/appearance";
import {
  buddyCities,
  buddyMonth,
  buddyPeriods,
  buddyStages,
  buddyPurposes,
  buddyPlanFromRow,
  buddyPlanError,
  buddyUnavailable,
  defaultBuddyPlan,
  emptyBuddyFilters,
  type ApplicationBuddy,
  type BuddyFilters,
  type BuddyPlan,
  type BuddyStage,
} from "../lib/application-buddies";
import { Avatar } from "./PostCard";
import { Button, Chip, Field, Message, Sheet, styles, colors } from "./ui";

export function ApplicationBuddies({
  countryId,
  countryName,
  header,
}: {
  countryId: string;
  countryName: string;
  header: ReactNode;
}) {
  useAppearance();
  const { session, profile, loading } = useAuth();
  const cache = useQueryClient();
  const [filters, setFilters] = useState<BuddyFilters>(emptyBuddyFilters);
  const [filterDraft, setFilterDraft] = useState(filters);
  const [filterOpen, setFilterOpen] = useState(false);
  const own = useOwnBuddyPlan(countryId);
  const list = useApplicationBuddies(countryId, filters);
  const [draft, setDraft] = useState<BuddyPlan>(() =>
    defaultBuddyPlan(countryId),
  );
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  useFocusEffect(
    useCallback(() => {
      if (session)
        void cache.invalidateQueries({
          queryKey: ["application-buddies", session.user.id, countryId],
        });
    }, [cache, session, countryId]),
  );
  const people = [
    ...new Map(
      (list.data?.pages.flat() ?? []).map((person) => [person.user_id, person]),
    ).values(),
  ];
  const border = themeColor("#E4E4E4", "border");
  const unavailable =
    buddyUnavailable(list.error) || buddyUnavailable(own.error);
  const edit = () => {
    setFormError("");
    const next = own.data
      ? buddyPlanFromRow(own.data)
      : defaultBuddyPlan(countryId);
    setDraft({
      ...next,
      period: buddyPeriods().includes(next.period)
        ? next.period
        : buddyPeriods()[0],
    });
    setMenu(false);
    setEditing(true);
  };
  const refresh = async () => {
    await cache.invalidateQueries({
      queryKey: ["application-buddies", session?.user.id, countryId],
    });
  };
  const openChat = async (person: ApplicationBuddy) => {
    if (opening) return;
    setOpening(person.user_id);
    setError("");
    try {
      const r = await db().rpc("chat_create_private", {
        recipients: [person.user_id],
        room_title: "",
      });
      if (r.error) throw r.error;
      void cache.invalidateQueries({
        queryKey: ["chat", "inbox", session?.user.id],
      });
      router.push(`/chat/${r.data}`);
    } catch (e) {
      setError(chatError(e));
    } finally {
      setOpening(null);
    }
  };
  const save = async () => {
    if (busy || !session) return;
    const validation = buddyPlanError(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const r = await db().rpc("save_buddy_plan", {
        target_country: countryId,
        plan_city: draft.applicationCity.trim(),
        target_destination: draft.destination.trim(),
        target_month: draft.period + "-01",
        target_purpose: draft.purpose,
        target_stage: draft.stage,
      });
      if (r.error) throw r.error;
      await refresh();
      setEditing(false);
    } catch (e) {
      setFormError(
        buddyUnavailable(e)
          ? "Katılım şu anda kullanılamıyor."
          : "Plan kaydedilemedi. Yeniden dene.",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (busy || !session) return;
    setBusy(true);
    setFormError("");
    try {
      const r = await db()
        .from("application_buddy_plans")
        .delete()
        .eq("user_id", session.user.id)
        .eq("country_id", countryId)
        .select("user_id");
      if (r.error) throw r.error;
      if (!r.data?.length) throw Error("Not deleted");
      await refresh();
      setLeaving(false);
    } catch {
      setFormError("Listeden ayrılınamadı. Yeniden dene.");
    } finally {
      setBusy(false);
    }
  };
  const row = (person: ApplicationBuddy) => (
    <View
      testID={`buddy-${person.user_id}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${person.display_name} profilini aç`}
        onPress={() => router.push(`/profile/${person.username}`)}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 11,
        }}
      >
        <Avatar name={person.display_name} url={person.avatar_url} size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={1}
            style={[styles.pillText, { fontSize: textSize(15) }]}
          >
            {person.display_name}
          </Text>
          <Text style={[styles.muted, { fontSize: textSize(12) }]}>
            {person.application_city} · {buddyMonth(person.application_month)}
          </Text>
          <Text style={{ fontSize: textSize(13), color: colors.text }}>
            {person.destination_city} · {person.purpose}
          </Text>
          <Text style={[styles.muted, { fontSize: textSize(11) }]}>
            {buddyStages[person.stage]}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.display_name} kişisine mesaj gönder`}
        disabled={!!opening}
        onPress={() => void openChat(person)}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          opacity: opening === person.user_id ? 0.5 : 1,
        }}
      >
        <Ionicons
          name={
            opening === person.user_id
              ? "ellipsis-horizontal"
              : "chatbubble-outline"
          }
          size={23}
          color={colors.navy}
        />
      </Pressable>
    </View>
  );
  return (
    <>
      <FlatList
        style={styles.page}
        contentContainerStyle={[styles.content, { gap: 0, paddingBottom: 30 }]}
        data={people}
        keyExtractor={(person) => person.user_id}
        renderItem={({ item }) => row(item)}
        keyboardShouldPersistTaps="handled"
        refreshing={list.isRefetching}
        onRefresh={() => void refresh()}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetching) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {header}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text
                style={[styles.heading, { fontSize: textSize(18), flex: 1 }]}
              >
                Başvuru arkadaşları
              </Text>
              {!!session && !unavailable && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Başvuru arkadaşlarını filtrele"
                  onPress={() => {
                    setFilterDraft(filters);
                    setFilterOpen(true);
                  }}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="options-outline"
                    size={21}
                    color={colors.navy}
                  />
                </Pressable>
              )}
            </View>
            {!!session &&
              !own.isPending &&
              !unavailable &&
              !own.isError &&
              (own.data ? (
                <View
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Avatar
                    name={profile?.display_name ?? "Sen"}
                    url={profile?.avatar_url}
                    size={36}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.pillText}>Başvuru planın</Text>
                    <Text style={[styles.muted, { fontSize: textSize(12) }]}>
                      {own.data.application_city} · {own.data.destination_city}{" "}
                      · {buddyMonth(own.data.application_month)}
                    </Text>
                    {own.data.application_month.slice(0, 7) <
                      buddyPeriods()[0] && (
                      <Text style={[styles.muted, { color: colors.amber }]}>
                        Dönemi güncelle
                      </Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Başvuru planı seçenekleri"
                    onPress={() => {
                      setError("");
                      setMenu(true);
                    }}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={21}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: border,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.pillText}>Sen de katıl</Text>
                    <Text style={[styles.muted, { fontSize: textSize(12) }]}>
                      Ülke, başvuru yeri ve dönemine göre.
                    </Text>
                  </View>
                  <Button label="Plan ekle" onPress={edit} />
                </View>
              ))}
            {!!(filters.city || filters.destination || filters.period) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Başvuru arkadaşı filtrelerini temizle"
                onPress={() => setFilters(emptyBuddyFilters)}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Text style={[styles.muted, { flex: 1 }]}>
                  {[
                    filters.city,
                    filters.destination,
                    filters.period ? buddyMonth(filters.period) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            )}
            {own.isError && !unavailable && people.length > 0 && (
              <Text style={styles.muted}>
                Başvuru planın yüklenemedi. Sayfayı yenileyebilirsin.
              </Text>
            )}
            {list.isError && people.length > 0 && (
              <Text style={styles.muted}>
                Liste güncellenemedi. Yeniden dene.
              </Text>
            )}
            <Message text={error} />
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 24, gap: 12 }}>
            {loading ? (
              <Text style={styles.muted}>Yükleniyor…</Text>
            ) : !session ? (
              <>
                <Text style={styles.text}>
                  Katılanları görmek için giriş yap.
                </Text>
                <Button
                  label="Giriş yap"
                  onPress={() => router.push("/auth")}
                />
              </>
            ) : unavailable ? (
              <>
                <Text style={styles.muted}>
                  {profile?.role === "admin"
                    ? "Başvuru arkadaşları kurulumu gerekli."
                    : "Başvuru arkadaşları henüz kullanılamıyor."}
                </Text>
                {profile?.role === "admin" && (
                  <Button
                    secondary
                    label="Kurulum dosyasını aç"
                    onPress={() =>
                      void Linking.openURL(
                        "https://github.com/ugurkihsan1/vizerotasi/blob/main/docs/APPLICATION_BUDDIES_UPGRADE.sql",
                      ).catch(() => setError("Dosya açılamadı."))
                    }
                  />
                )}
              </>
            ) : list.isError || own.isError ? (
              <>
                <Text style={styles.muted}>Başvurular yüklenemedi.</Text>
                <Button
                  secondary
                  label="Yeniden dene"
                  onPress={() => void refresh()}
                />
              </>
            ) : list.isPending ? (
              <Text style={styles.muted}>Başvurular yükleniyor…</Text>
            ) : (
              <Text style={styles.muted}>
                {filters.city || filters.destination || filters.period
                  ? "Bu filtrelerde başvuru yok."
                  : own.data
                    ? "Henüz başka katılan yok."
                    : "Henüz katılan yok."}
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          list.hasNextPage ? (
            <Button
              secondary
              label={
                list.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla kişi"
              }
              disabled={list.isFetching}
              onPress={() => void list.fetchNextPage()}
            />
          ) : undefined
        }
      />
      <Sheet
        visible={editing}
        title={own.data ? "Başvuru planını düzenle" : "Başvuru planın"}
        onClose={() => {
          if (!busy) setEditing(false);
        }}
      >
        <Text style={styles.muted}>
          {countryName} · Kaydettiğinde üyeler bu plandan seni bulabilir.
        </Text>
        <Field
          label="Başvuru yeri"
          value={draft.applicationCity}
          maxLength={80}
          placeholder="Örn. İstanbul"
          onChangeText={(applicationCity) =>
            setDraft({ ...draft, applicationCity })
          }
        />
        <Field
          label="Gidilecek şehir"
          value={draft.destination}
          maxLength={80}
          placeholder={buddyCities[countryId]?.join(", ") ?? "Şehir adı"}
          onChangeText={(destination) => setDraft({ ...draft, destination })}
        />
        <Text style={styles.muted}>Başvuru dönemi</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7 }}
        >
          {buddyPeriods().map((period) => (
            <Chip
              key={period}
              label={buddyMonth(period)}
              active={draft.period === period}
              onPress={() => setDraft({ ...draft, period })}
            />
          ))}
        </ScrollView>
        <Text style={styles.muted}>Seyahat amacı</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7 }}
        >
          {buddyPurposes.map((purpose) => (
            <Chip
              key={purpose}
              label={purpose}
              active={draft.purpose === purpose}
              onPress={() => setDraft({ ...draft, purpose })}
            />
          ))}
        </ScrollView>
        <Text style={styles.muted}>Başvuru aşaması</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7 }}
        >
          {Object.entries(buddyStages).map(([stage, label]) => (
            <Chip
              key={stage}
              label={label}
              active={draft.stage === stage}
              onPress={() => setDraft({ ...draft, stage: stage as BuddyStage })}
            />
          ))}
        </ScrollView>
        <Message text={formError} />
        <Button
          label={busy ? "Kaydediliyor…" : own.data ? "Kaydet" : "Katıl"}
          disabled={busy}
          onPress={() => void save()}
        />
      </Sheet>
      <Sheet
        visible={menu}
        title="Başvuru planın"
        onClose={() => setMenu(false)}
      >
        <Button secondary label="Planı düzenle" onPress={edit} />
        <Button
          secondary
          label="Listeden ayrıl"
          onPress={() => {
            setMenu(false);
            setFormError("");
            setLeaving(true);
          }}
        />
      </Sheet>
      <Sheet
        visible={leaving}
        title="Listeden ayrıl?"
        onClose={() => {
          if (!busy) setLeaving(false);
        }}
      >
        <Text style={styles.muted}>Başvuru planın silinecek.</Text>
        <Message text={formError} />
        <Button
          label={busy ? "Siliniyor…" : "Planımı sil"}
          disabled={busy}
          onPress={() => void remove()}
        />
      </Sheet>
      <Sheet
        visible={filterOpen}
        title="Başvuruları filtrele"
        onClose={() => setFilterOpen(false)}
      >
        <Field
          label="Başvuru yeri filtresi"
          placeholder="Tüm şehirler"
          value={filterDraft.city}
          maxLength={80}
          onChangeText={(city) => setFilterDraft({ ...filterDraft, city })}
        />
        <Field
          label="Varış şehri filtresi"
          placeholder="Tüm şehirler"
          value={filterDraft.destination}
          maxLength={80}
          onChangeText={(destination) =>
            setFilterDraft({ ...filterDraft, destination })
          }
        />
        <Text style={styles.muted}>Başvuru dönemi</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7 }}
        >
          <Chip
            label="Tümü"
            active={!filterDraft.period}
            onPress={() => setFilterDraft({ ...filterDraft, period: "" })}
          />
          {buddyPeriods().map((period) => (
            <Chip
              key={period}
              label={buddyMonth(period)}
              active={filterDraft.period === period}
              onPress={() => setFilterDraft({ ...filterDraft, period })}
            />
          ))}
        </ScrollView>
        <Button
          label="Uygula"
          onPress={() => {
            setFilters({
              ...filterDraft,
              city: filterDraft.city.trim(),
              destination: filterDraft.destination.trim(),
            });
            setFilterOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
