import { VisaFeeSection } from "../../src/components/VisaFeeSection";
import { CommunityTips } from "../../src/components/CommunityTips";
import { documentTopicId } from "../../src/lib/guide-topics";
import { Ionicons } from "@expo/vector-icons";
import { useAppearance, themeColor, textSize } from "../../src/lib/appearance";
import { CountryFlag } from "../../src/components/CountryFlag";
import { ScrollTabs } from "../../src/components/ScrollTabs";
import { CommunityChatEntry } from "../../src/components/ChatEntry";
import { DocumentWarnings } from "../../src/components/DocumentWarnings";
import { DestinationPhoto } from "../../src/components/DestinationPhoto";
import { CountryGuide } from "../../src/components/CountryGuide";
import { getCountryGuide } from "../../src/lib/country-guides";
import {
  SpainDocuments,
  SpainGuide,
} from "../../src/components/SpainDocuments";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/lib/auth";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Linking,
  ScrollView,
  Pressable,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useCountries, useDocuments, useToggle } from "../../src/lib/data";
import { db, configured } from "../../src/lib/supabase";
import { Feed } from "../../src/components/Feed";
import {
  styles,
  colors,
  Button,
  Sheet,
  useGate,
  Empty,
  Message,
} from "../../src/components/ui";
import type { Document } from "../../src/lib/types";
function Follow({ id }: { id: string }) {
  useAppearance();

  const follow = useToggle("followed_countries", "country_id", id);
  const gate = useGate();
  const [error, setError] = useState("");
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={follow.active ? "Takip ediliyor" : "Takip et"}
        accessibilityState={{
          selected: follow.active,
          disabled: follow.pending,
        }}
        disabled={follow.pending}
        onPress={() =>
          gate.require(() => {
            void follow.toggle().catch(() => setError("Takip güncellenemedi."));
          })
        }
        style={({ pressed }) => ({
          minHeight: 44,
          paddingHorizontal: 15,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: follow.active
            ? themeColor("#E4E4E4", "border")
            : colors.navy,
          backgroundColor: follow.active ? colors.bg : colors.navy,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          opacity: pressed || follow.pending ? 0.6 : 1,
        })}
      >
        {follow.active && (
          <Ionicons name="checkmark" size={15} color={colors.navy} />
        )}
        <Text
          style={{
            fontSize: textSize(12),
            fontWeight: "600",
            color: follow.active ? colors.navy : colors.bg,
          }}
        >
          {follow.active ? "Takip ediliyor" : "Takip et"}
        </Text>
      </Pressable>
      <Message text={error} />
      {gate.view}
    </>
  );
}
function DocumentRow({ doc }: { doc: Document }) {
  useAppearance();

  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const { session } = useAuth();
  const checklistKey = `document-ready:${session?.user.id ?? "guest"}:${doc.id}`;
  useEffect(() => {
    void AsyncStorage.getItem(checklistKey)
      .then((v) => setChecked(v === "true"))
      .catch(() => {});
  }, [checklistKey]);
  const gate = useGate();
  const save = useToggle("saved_items", "document_id", doc.id);
  const [error, setError] = useState("");
  return (
    <View style={[styles.card, { padding: 10, gap: 4, borderRadius: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${doc.title}: Hazırladım`}
          accessibilityState={{ checked }}
          aria-checked={checked}
          onPress={() => {
            setChecked(!checked);
            void AsyncStorage.setItem(checklistKey, String(!checked));
          }}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={checked ? "checkbox" : "square-outline"}
            size={24}
            color={checked ? colors.green : colors.muted}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={doc.title}
          onPress={() => setOpen(true)}
          style={{
            flex: 1,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text style={[styles.pillText, { flex: 1 }]}>{doc.title}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <CommunityTips
        country={doc.country_id}
        categories={[documentTopicId(doc.id)]}
        topicLabel={doc.title}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={doc.title}>
        <Text style={styles.text}>{doc.body}</Text>
        <DocumentWarnings country={doc.country_id} documentId={doc.id} />
        {doc.source_url && (
          <Button
            secondary
            label="Resmî kaynağı aç"
            onPress={() =>
              void Linking.openURL(doc.source_url!).catch(() =>
                setError("Bağlantı açılamadı."),
              )
            }
          />
        )}
        <Button
          secondary
          label={save.active ? "Kaydedildi" : "Belgeyi kaydet"}
          onPress={() =>
            gate.require(() => {
              void save.toggle().catch(() => setError("Kaydedilemedi."));
            })
          }
        />
        <Button
          secondary
          label="Bu konuda önemli bilgi paylaş"
          onPress={() => {
            setOpen(false);
            router.push({
              pathname: "/create",
              params: {
                kind: "tip",
                country: doc.country_id,
                category: documentTopicId(doc.id),
              },
            });
          }}
        />
        <Button
          label="Bu belge hakkındaki deneyimleri gör"
          onPress={() => {
            setOpen(false);
            router.push({ pathname: "/discover", params: { q: doc.title } });
          }}
        />
        <Button
          label="Bu belge hakkında soru sor"
          onPress={() => {
            setOpen(false);
            router.push({
              pathname: "/create",
              params: {
                kind: "question",
                country: doc.country_id,
                title: doc.title,
              },
            });
          }}
        />
        <Message text={error} />
      </Sheet>
      {gate.view}
    </View>
  );
}
export default function Country() {
  useAppearance();

  const { id, tab: initialTab } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const [tab, setTab] = useState(
    initialTab === "Belgeler"
      ? "Belgeler"
      : initialTab === "Rehber"
        ? "Rehber"
        : "Akış",
  );
  const { data: countries } = useCountries();
  const country = countries?.find((c) => c.id === id);
  const documents = useDocuments(id);
  const stats = useQuery({
    queryKey: ["country-stats", id],
    enabled: configured,
    queryFn: async () => {
      const r = await db().rpc("country_stats", { target_country: id });
      if (r.error) throw r.error;
      return r.data?.[0] as
        | {
            experiences: number;
            questions: number;
            tips: number;
            average_days: number | null;
            recent: number;
          }
        | undefined;
    },
  });
  const hasGuide = !!(
    id === "spain" ||
    getCountryGuide(id) ||
    country?.summary ||
    country?.source_url ||
    country?.appointment_url
  );
  const section = tab === "Belgeler" || tab === "Rehber" ? tab : "Akış";
  const sections = [
    { label: "Akış", icon: "albums-outline" },
    { label: "Belgeler", icon: "documents-outline" },
    ...(hasGuide ? [{ label: "Rehber", icon: "map-outline" as const }] : []),
  ] as const;
  const header = (
    <View style={{ gap: 14 }}>
      {section !== "Belgeler" && (
        <View
          style={{
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: themeColor("#E4E9E5", "surface"),
          }}
        >
          <DestinationPhoto id={id} height={156} showFlag={false} />
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            {country && (
              <CountryFlag
                code={country.code}
                emoji={country.flag}
                name={country.name}
              />
            )}
            <Text
              numberOfLines={2}
              style={{
                flexShrink: 1,
                fontSize: textSize(25),
                fontWeight: "700",
                letterSpacing: -0.7,
                color: colors.navy,
              }}
            >
              {country?.name ?? "Ülke"}
            </Text>
          </View>
        </View>
        <Follow id={id} />
        <CommunityChatEntry
          compact
          countryId={id}
          name={country?.name ?? "Ülke"}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderWidth: 1,
              borderColor: themeColor("#E4E4E4", "border"),
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={21}
              color={colors.navy}
            />
          </View>
        </CommunityChatEntry>
      </View>
      {section !== "Belgeler" && (
        <View style={{ gap: 9 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                value: stats.data?.experiences,
                label: "deneyim",
                target: "Deneyimler",
              },
              {
                value: stats.data?.questions,
                label: "soru",
                target: "Sorular",
              },
              {
                value: stats.data?.tips,
                label: "önemli bilgi",
                target: "Önemli",
              },
            ].map((item) => (
              <Pressable
                key={item.target}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${item.value ?? "—"}`}
                onPress={() => setTab(item.target)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ fontSize: textSize(12), color: colors.muted }}>
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: textSize(15),
                      color: colors.navy,
                    }}
                  >
                    {item.value ?? "—"}
                  </Text>{" "}
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {stats.data?.average_days != null && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: -8,
              }}
            >
              <Ionicons name="time-outline" size={13} color={colors.muted} />
              <Text style={{ fontSize: textSize(11), color: colors.muted }}>
                Ortalama sonuç · {stats.data.average_days} gün
              </Text>
            </View>
          )}
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: themeColor("#E4E4E4", "border"),
        }}
      >
        {sections.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: section === item.label }}
            aria-pressed={section === item.label}
            onPress={() => setTab(item.label)}
            style={{
              flex: 1,
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              borderBottomWidth: section === item.label ? 2 : 0,
              borderBottomColor: colors.navy,
              marginBottom: -1,
            }}
          >
            <Ionicons
              name={item.icon}
              size={18}
              color={section === item.label ? colors.navy : colors.muted}
            />
            <Text
              style={{
                fontSize: textSize(13),
                fontWeight: section === item.label ? "700" : "500",
                color: section === item.label ? colors.navy : colors.muted,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
  if (id === "spain" && tab === "Belgeler")
    return <SpainDocuments header={header} />;
  if (id === "spain" && tab === "Rehber") return <SpainGuide header={header} />;
  if (getCountryGuide(id) && (tab === "Belgeler" || tab === "Rehber"))
    return (
      <CountryGuide
        key={`${id}:${tab}`}
        country={id}
        mode={tab === "Belgeler" ? "documents" : "guide"}
        header={header}
      />
    );
  if (tab === "Rehber")
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {header}
        {!!country?.summary && (
          <Text style={styles.text}>{country.summary}</Text>
        )}
        {country?.appointment_url && (
          <Button
            secondary
            label="Randevu"
            onPress={() =>
              void Linking.openURL(country.appointment_url!).catch(() => {})
            }
          />
        )}
        {country?.source_url && (
          <Button
            secondary
            label="Resmî kaynak"
            onPress={() =>
              void Linking.openURL(country.source_url!).catch(() => {})
            }
          />
        )}
      </ScrollView>
    );
  return tab === "Belgeler" ? (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          {header}
          <VisaFeeSection country={id} />
        </View>
      }
      data={documents.data ?? []}
      keyExtractor={(x) => x.id}
      renderItem={({ item }) => <DocumentRow doc={item} />}
      ListEmptyComponent={
        <Empty
          title="Belge listesi henüz eklenmedi"
          body="Güncel gereklilikler için ilgili resmî başvuru kaynağını kontrol et."
        />
      }
    />
  ) : (
    <Feed
      key={tab}
      country={id}
      header={header}
      homeTabs={
        <ScrollTabs
          labels={[
            "Tümü",
            "Deneyimler",
            "Sorular",
            "Önemli",
            ...(id === "spain" ? ["Ret Deneyimleri"] : []),
          ]}
          value={tab === "Akış" ? "Tümü" : tab}
          onChange={(label) => setTab(label === "Tümü" ? "Akış" : label)}
        />
      }
      baseFilter={{
        result: tab === "Ret Deneyimleri" ? "rejected" : undefined,
        kind:
          tab === "Deneyimler"
            ? "experience"
            : tab === "Sorular"
              ? "question"
              : tab === "Önemli"
                ? "tip"
                : undefined,
      }}
    />
  );
}
