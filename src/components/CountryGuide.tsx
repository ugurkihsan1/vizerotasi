import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  getCountryGuide,
  mergeCountryDocuments,
  type OfficialDocument,
} from "../lib/country-guides";
import { useDocuments } from "../lib/data";
import { useAuth } from "../lib/auth";
import type { Document } from "../lib/types";
import { styles, colors, Button, Message } from "./ui";
import { GuideSection } from "./SpainDocuments";
import { CommunityTips } from "./CommunityTips";
import { DocumentWarnings } from "./DocumentWarnings";
import { CriticalNotice } from "./CriticalNotice";
type GuideDocument = Document & Partial<OfficialDocument>;
function OfficialLink({ url, label }: { url: string; label: string }) {
  const [error, setError] = useState("");
  return (
    <View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() =>
          void Linking.openURL(url).catch(() =>
            setError("Kaynak bağlantısı açılamadı."),
          )
        }
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={{ color: colors.blue, fontSize: 13 }}>{label} ↗</Text>
      </Pressable>
      <Message text={error} />
    </View>
  );
}
function DocumentCard({
  doc,
  checked,
  onCheck,
}: {
  doc: GuideDocument;
  checked: boolean;
  onCheck: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={doc.title}
          accessibilityState={{ expanded: open }}
          aria-expanded={open}
          onPress={() => setOpen(!open)}
          style={{ flex: 1, minHeight: 44, gap: 4 }}
        >
          <Text style={styles.pillText}>
            {doc.sort_order ? `${doc.sort_order}. ` : ""}
            {doc.title}
          </Text>
          <Text style={styles.muted}>
            {doc.requirement === "conditional"
              ? "Durumuna bağlı"
              : "Temel belge"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${doc.title}: Hazırladım`}
          accessibilityState={{ checked }}
          aria-checked={checked}
          onPress={onCheck}
          style={{
            width: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={checked ? "checkbox" : "square-outline"}
            color={checked ? colors.green : colors.muted}
            size={24}
          />
        </Pressable>
      </View>
      {doc.alert && (
        <CriticalNotice
          title={doc.alert.title}
          source="reference"
          referenceLabel="Resmî kaynak notu"
        >
          <Text style={styles.text}>{doc.alert.body}</Text>
          <OfficialLink
            url={doc.alert.source_url}
            label="Uyarının resmî kaynağı"
          />
        </CriticalNotice>
      )}
      <CommunityTips
        country={doc.country_id}
        categories={doc.topic_ids ?? []}
      />
      <DocumentWarnings country={doc.country_id} documentId={doc.id} />
      {open && (
        <View style={{ gap: 10 }}>
          <Text style={styles.text}>{doc.body}</Text>
          <Text style={[styles.muted, { fontSize: 11 }]}>
            {doc.source_name ?? "Kaynak"}
            {doc.source_checked_at
              ? ` · Kontrol: ${doc.source_checked_at}`
              : ""}
          </Text>
          {doc.source_url && (
            <OfficialLink url={doc.source_url} label="Belgenin resmî kaynağı" />
          )}
          <Button
            secondary
            label="Bu konuda kritik bilgi paylaş"
            onPress={() =>
              router.push({
                pathname: "/create",
                params: {
                  kind: "tip",
                  country: doc.country_id,
                  category: doc.topic_ids?.[0] ?? "documents",
                },
              })
            }
          />
        </View>
      )}
    </View>
  );
}
export function CountryGuide({
  country,
  mode,
  header,
}: {
  country: string;
  mode: "documents" | "guide";
  header: React.ReactElement;
}) {
  const guide = getCountryGuide(country)!;
  const q = useDocuments(country);
  const documents = mergeCountryDocuments(
    country,
    q.data ?? [],
  ) as GuideDocument[];
  const { session } = useAuth();
  const storageKey = `country-checklist:v1:${country}:${session?.user.id ?? "guest"}`;
  const [checklist, setChecklist] = useState<{ key: string; ids: string[] }>({
    key: storageKey,
    ids: [],
  });
  const ready = checklist.key === storageKey ? checklist.ids : [];
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((v) => {
        if (active) {
          const ids = v ? JSON.parse(v) : [];
          setChecklist({ key: storageKey, ids: Array.isArray(ids) ? ids : [] });
        }
      })
      .catch(() => setError("Kontrol listen yüklenemedi."));
    return () => {
      active = false;
    };
  }, [storageKey]);
  function toggle(id: string) {
    const next = ready.includes(id)
      ? ready.filter((x) => x !== id)
      : [...ready, id];
    setChecklist({ key: storageKey, ids: next });
    void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() =>
      setError("İşaretlemen kaydedilemedi."),
    );
  }
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={mode === "documents" ? documents : []}
      keyExtractor={(d) => d.id}
      renderItem={({ item }) => (
        <DocumentCard
          doc={item}
          checked={ready.includes(item.id)}
          onCheck={() => toggle(item.id)}
        />
      )}
      ListHeaderComponent={
        <View style={{ gap: 16, paddingBottom: 16 }}>
          {header}
          <Text style={styles.heading}>
            {guide.name} ·{" "}
            {mode === "documents"
              ? "Turistik vize belgeleri"
              : "Başvuru rehberi"}
          </Text>
          <Text style={styles.muted}>{guide.scope}</Text>
          {mode === "documents" && (
            <View style={styles.card}>
              <Text style={styles.pillText}>
                {documents.filter((d) => ready.includes(d.id)).length} /{" "}
                {documents.length} belge işaretlendi
              </Text>
              <Text style={styles.muted}>
                Durumuna bağlı belgeler yalnız sana uygunsa gerekir. İşaretlemek
                resmî uygunluk veya vize onayı anlamına gelmez.
              </Text>
            </View>
          )}
          <Message text={error} />
          {mode === "guide" && (
            <>
              <GuideSection
                title="Başvuru Süreci"
                notes={
                  <CommunityTips
                    country={country}
                    categories={["documents", "other"]}
                  />
                }
              >
                <Text style={styles.text}>
                  1. Ana seyahat ülkeni ve ikamet yerine göre yetkili
                  temsilciliği belirle.
                </Text>
                <Text style={styles.text}>
                  2. Kısa süreli turizm formunu ve durumuna uygun belge
                  listesini hazırla.
                </Text>
                <Text style={styles.text}>
                  3. Resmî yönlendirmeden randevu al; belgelerini ve biyometrik
                  verilerini sun.
                </Text>
                <Text style={styles.text}>
                  4. Başvurunu yetkili kanaldan takip et; pasaportundaki vize
                  tarihlerini ve giriş sayısını kontrol et.
                </Text>
              </GuideSection>
              <GuideSection
                title="Randevu"
                notes={
                  <CommunityTips
                    country={country}
                    categories={["appointment"]}
                  />
                }
              >
                <Text style={styles.text}>{guide.appointment}</Text>
                <OfficialLink
                  url={guide.sources[0].url}
                  label="Resmî randevu yönlendirmesi"
                />
              </GuideSection>
              <GuideSection
                title="Konaklama ve davet mektubu"
                notes={
                  <CommunityTips
                    country={country}
                    categories={["invitation"]}
                  />
                }
              >
                <Text style={styles.text}>
                  {guide.documents.find((d) => d.key === "accommodation")?.body}
                </Text>
                <Text style={styles.text}>
                  {guide.documents.find((d) => d.key === "sponsor")?.body}
                </Text>
              </GuideSection>
              <GuideSection title="Başvuru zamanı ve işlem süresi">
                <Text style={styles.text}>{guide.timing}</Text>
                <Text style={styles.text}>{guide.processing}</Text>
                <OfficialLink
                  url={guide.sources.find((s) => s.id === "eu")!.url}
                  label="Avrupa Komisyonu süre bilgisi"
                />
              </GuideSection>
              <GuideSection title="Ücretler ve biyometri">
                <Text style={styles.text}>
                  Avrupa Komisyonu genel tarifesinde yetişkin için 90 €, 6–12
                  yaş için 45 € vize harcı belirtilir. Yaşa, vatandaşlığa ve
                  aile durumuna göre muafiyet/indirimler olabilir. Başvuru
                  merkezi hizmeti ayrıca ücretlendirilebilir; ülkenin güncel
                  ödeme şekli ve para birimini resmî kaynaktan doğrula.
                </Text>
                <Text style={styles.text}>
                  Başvuru sırasında parmak izi ve fotoğraf işlemleri uygulanır;
                  yaşa ve önceki biyometri kaydına göre istisnalar bulunur.
                  Randevu talimatındaki şahsen bulunma koşulunu takip et.
                </Text>
                <OfficialLink
                  url={guide.sources.find((s) => s.id === "eu")!.url}
                  label="Ortak ücret ve biyometri koşulları"
                />
              </GuideSection>
              <GuideSection
                title="Ret ve yeniden başvuru"
                notes={
                  <CommunityTips country={country} categories={["rejection"]} />
                }
              >
                <Text style={styles.text}>
                  Ret kararı gerekçe ve itiraz yolunu içerir. İtiraz süresi ve
                  yetkili makam ülkeye göre değişir; karardaki süreyi ve resmî
                  temsilcilik talimatını takip et. Bu rehber vize onayı
                  garantisi vermez.
                </Text>
              </GuideSection>
            </>
          )}
          <View style={[styles.card, { backgroundColor: "#EDF3FC" }]}>
            <Text style={styles.pillText}>Resmî kaynaklar</Text>
            <Text style={styles.muted}>
              Ülkeye özgü talimatlar ve ortak Schengen koşulları ayrı
              kaynaklardır. Bağlantılar 22.10.2026 tarihinde kontrol edildi; bu,
              belgelerin yayın tarihi değildir.
            </Text>
            {guide.sources.map((s) => (
              <View key={s.id}>
                <Text style={[styles.muted, { fontSize: 11 }]}>{s.scope}</Text>
                <OfficialLink url={s.url} label={s.name} />
              </View>
            ))}
          </View>
        </View>
      }
    />
  );
}
