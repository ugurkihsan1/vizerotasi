import { ApplicationBuddies } from "../../src/components/ApplicationBuddies";
import { VisaFeeSection } from "../../src/components/VisaFeeSection";
import { CommunityTips } from "../../src/components/CommunityTips";
import { documentTopicId } from "../../src/lib/guide-topics";
import { Ionicons } from "@expo/vector-icons";
import { useAppearance, themeColor } from "../../src/lib/appearance";
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
      <Button
        label={follow.active ? "✓ Takip ediliyor" : "Takip et"}
        disabled={follow.pending}
        onPress={() =>
          gate.require(() => {
            void follow.toggle().catch(() => setError("Takip güncellenemedi."));
          })
        }
      />
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
    initialTab === "Arkadaşlar"
      ? "Arkadaşlar"
      : initialTab === "Belgeler"
        ? "Belgeler"
        : initialTab === "Rehber"
          ? "Rehber"
          : "Akış",
  );
  const { session } = useAuth();
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
  const header = (
    <View style={{ gap: 16 }}>
      {!["Belgeler", "Arkadaşlar"].includes(tab) && (
        <View
          style={{
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: themeColor("#DFE9E2", "surface"),
          }}
        >
          <DestinationPhoto id={id} height={120} />
        </View>
      )}
      <View style={styles.row}>
        {country && (
          <CountryFlag
            code={country.code}
            emoji={country.flag}
            name={country.name}
          />
        )}
        <Text style={styles.title}>{country?.name ?? "Ülke topluluğu"}</Text>
      </View>
      {!["Belgeler", "Arkadaşlar"].includes(tab) && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Follow id={id} />
          </View>
          <View style={{ flex: 1 }}>
            <CommunityChatEntry countryId={id} name={country?.name ?? "Ülke"} />
          </View>
        </View>
      )}
      {!["Belgeler", "Arkadaşlar"].includes(tab) && (
        <View style={styles.row}>
          <Text style={styles.pillText}>
            {stats.data?.experiences ?? "—"} deneyim
          </Text>
          <Text style={styles.pillText}>
            · {stats.data?.questions ?? "—"} soru
          </Text>
          <Text style={styles.pillText}>
            · {stats.data?.tips ?? "—"} önemli bilgi
          </Text>
        </View>
      )}
      {!["Belgeler", "Arkadaşlar"].includes(tab) &&
        stats.data?.average_days != null && (
          <Text style={styles.muted}>
            Ortalama sonuç: {stats.data.average_days} gün · Topluluk deneyimleri
          </Text>
        )}
      <ScrollTabs
        plain
        labels={
          id === "spain"
            ? [
                "Akış",
                "Arkadaşlar",
                "Deneyimler",
                "Sorular",
                "Ret Deneyimleri",
                "Önemli",
                "Belgeler",
                "Rehber",
              ]
            : [
                "Akış",
                "Arkadaşlar",
                "Deneyimler",
                "Sorular",
                "Önemli",
                "Belgeler",
                ...(getCountryGuide(id) ||
                country?.summary ||
                country?.source_url ||
                country?.appointment_url
                  ? ["Rehber"]
                  : []),
              ]
        }
        value={tab}
        onChange={setTab}
      />
    </View>
  );
  if (tab === "Arkadaşlar")
    return (
      <ApplicationBuddies
        key={`${id}:${session?.user.id ?? "guest"}`}
        countryId={id}
        countryName={country?.name ?? "Ülke"}
        header={header}
      />
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
