import { webPath } from "../lib/web-path";
import { CriticalNotice } from "./CriticalNotice";
import { formatDate } from "../lib/dates";
import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { ChecklistSummary } from "./ChecklistSummary";
import { SourceDocumentWarning, DocumentWarnings } from "./DocumentWarnings";
import { CommunityTips } from "./CommunityTips";
import { spainDocumentTopics } from "../lib/guide-topics";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Linking,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { useDocuments } from "../lib/data";
import {
  mergeSpainDocuments,
  sectionsFor,
  spainSource,
  spainGuide,
  type GuideDocument,
} from "../lib/spain";
import { styles, colors, Sheet, Button, Message } from "./ui";
const employmentOptions = [
  ["", "Tüm durumlar"],
  ["employee", "Çalışan"],
  ["owner", "İşveren / Şirket sahibi"],
  ["retired", "Emekli"],
  ["unemployed", "Çalışmıyor"],
  ["student", "Öğrenci"],
];
export function SpainSource() {
  useAppearance();

  const [error, setError] = useState("");
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColor("#EDF3FC", "surface"), gap: 8 },
      ]}
    >
      <Text style={[styles.pillText, { color: colors.blue }]}>
        Başvuru merkezinin yayımladığı belge
      </Text>
      <Text style={styles.text}>{spainSource.name}</Text>
      <Text style={styles.muted}>{spainSource.document}</Text>
      <Text style={styles.muted}>
        {spainSource.scope} İkamet yerine ve başvuru merkezine göre farklılık
        olabilir. Yayın/güncelleme tarihi belgede belirtilmiyor; başvurmadan
        önce güncel listeyi kontrol et.
      </Text>
      <Pressable
        accessibilityRole="link"
        style={{ minHeight: 44, justifyContent: "center" }}
        onPress={() => {
          const path = spainSource.pdf_path;
          void Linking.openURL(
            Platform.OS === "web"
              ? `${window.location.origin}${webPath(path)}`
              : `https://ugurkihsan1.github.io/vizerotasi${path}`,
          ).catch(() => setError("Kaynak PDF açılamadı."));
        }}
      >
        <Text style={{ color: colors.blue, fontWeight: "600" }}>
          Kaynak PDF’yi aç ↗
        </Text>
      </Pressable>
      <Message text={error} />
    </View>
  );
}
function SpainAppointmentNotice() {
  useAppearance();
  const update = spainGuide.appointment_update;
  const [error, setError] = useState("");
  const open = (url: string) => {
    setError("");
    void Linking.openURL(url).catch(() => setError("Bağlantı açılamadı."));
  };
  return (
    <CriticalNotice
      title={update.title}
      source="reference"
      referenceLabel={`BLS duyurusu · ${formatDate(update.checked_at)}`}
    >
      {update.notes.map((note) => (
        <View key={note.title} style={{ gap: 4 }}>
          <Text style={styles.pillText}>{note.title}</Text>
          <Text style={styles.text}>{note.body}</Text>
        </View>
      ))}
      <Button
        label="BLS’den randevu al"
        onPress={() => open(update.booking_url)}
      />
      {update.sources.map((source) => (
        <Pressable
          key={source.url}
          accessibilityRole="link"
          accessibilityLabel={source.name}
          onPress={() => open(source.url)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: colors.blue }}>{source.name} ↗</Text>
        </Pressable>
      ))}
      <Message text={error} />
    </CriticalNotice>
  );
}
function DocumentAccordion({
  doc,
  employment,
  checked,
  onCheck,
}: {
  doc: GuideDocument;
  employment: string;
  checked: boolean;
  onCheck: () => void;
}) {
  useAppearance();

  const [open, setOpen] = useState(false);
  const [community, setCommunity] = useState(false);
  const sections = sectionsFor(doc, employment);
  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: 16,
          padding: open ? 14 : 10,
          gap: open ? 12 : 4,
          borderColor: checked
            ? themeColor("#C7DFD2", "border")
            : themeColor("#E9EDE8", "border"),
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          aria-expanded={open}
          accessibilityLabel={`${doc.sort_order}. ${doc.title}`}
          onPress={() => setOpen(!open)}
          style={{
            flex: 1,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.pillText}>{doc.title}</Text>
            {doc.requirement === "conditional" && (
              <Text style={[styles.muted, { fontSize: textSize(11) }]}>
                Duruma bağlı
              </Text>
            )}
          </View>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.muted}
          />
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
            size={24}
            color={checked ? colors.green : colors.muted}
          />
        </Pressable>
      </View>
      <SourceDocumentWarning order={doc.sort_order} />
      <DocumentWarnings
        country="spain"
        documentId={doc.id}
        documentKey={`spain-tourism-${doc.sort_order}`}
      />
      <CommunityTips
        country="spain"
        categories={spainDocumentTopics[doc.sort_order] ?? []}
      />
      {open && (
        <View style={{ gap: 14 }}>
          <Text style={styles.text}>{doc.body}</Text>
          {sections.map((section) => (
            <View key={section.title} style={{ gap: 7 }}>
              <Text style={styles.pillText}>
                {section.title}
                {section.requirement === "recommended" ? " · Tavsiye" : ""}
              </Text>
              {section.items.map((item, index) => (
                <Text key={index} style={styles.text}>
                  {index + 1}. {item}
                </Text>
              ))}
            </View>
          ))}
          {doc.editor_note && (
            <View
              style={{
                backgroundColor: themeColor("#FFF7E8", "surface"),
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Text style={styles.pillText}>Editör açıklaması</Text>
              <Text style={styles.text}>{doc.editor_note}</Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => setCommunity(true)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: colors.blue }}>
              Bu belgeyi toplulukta konuş →
            </Text>
          </Pressable>
          <Text style={[styles.muted, { fontSize: textSize(11) }]}>
            Kaynak: {doc.source_name}. Topluluk deneyimleri bu belgenin resmî
            koşullarından ayrıdır.
          </Text>
        </View>
      )}
      <Sheet
        visible={community}
        onClose={() => setCommunity(false)}
        title={doc.title}
      >
        <Text style={styles.muted}>
          Topluluk paylaşımlarının yayınlanması, içeriğin resmî olarak
          doğrulandığı anlamına gelmez.
        </Text>
        <Button
          label="Deneyimlerde ara"
          onPress={() => {
            setCommunity(false);
            router.push({ pathname: "/discover", params: { q: doc.title } });
          }}
        />
        <Button
          secondary
          label="Bu belge hakkında önemli bilgi paylaş"
          onPress={() => {
            setCommunity(false);
            router.push({
              pathname: "/create",
              params: {
                kind: "tip",
                country: "spain",
                category:
                  spainDocumentTopics[doc.sort_order]?.[0] ?? "documents",
              },
            });
          }}
        />
        <Button
          secondary
          label="Bu belge hakkında soru sor"
          onPress={() => {
            setCommunity(false);
            router.push({
              pathname: "/create",
              params: { kind: "question", country: "spain", title: doc.title },
            });
          }}
        />
      </Sheet>
    </View>
  );
}
export function SpainDocuments({ header }: { header: React.ReactElement }) {
  useAppearance();

  const q = useDocuments("spain");
  const documents = mergeSpainDocuments(q.data ?? []);
  const { session } = useAuth();
  const key = `spain-tourism-checklist:v1:${session?.user.id ?? "guest"}`;
  const [ready, setReady] = useState<string[]>([]);
  const [employment, setEmployment] = useState("");
  const [select, setSelect] = useState(false);
  const [options, setOptions] = useState(false);
  const [under18, setUnder18] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key)
      .then((value) => {
        if (active) {
          const data = value ? JSON.parse(value) : [];
          setReady(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => setError("Kontrol listen yüklenemedi."));
    return () => {
      active = false;
    };
  }, [key]);
  async function toggle(id: string) {
    const next = ready.includes(id)
      ? ready.filter((x) => x !== id)
      : [...ready, id];
    setReady(next);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch {
      setError("İşaretlemelerin cihazına kaydedilemedi.");
    }
  }
  const completed = documents.filter((d) => ready.includes(d.id)).length;
  return (
    <>
      <FlatList
        style={styles.page}
        contentContainerStyle={styles.content}
        data={documents}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <DocumentAccordion
            doc={item}
            employment={employment}
            checked={ready.includes(item.id)}
            onCheck={() => void toggle(item.id)}
          />
        )}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 16 }}>
            {header}
            <ChecklistSummary
              complete={completed}
              total={documents.length}
              onOptions={() => setOptions(true)}
              filterLabel={
                employmentOptions.find(([v]) => v === employment)?.[1]
              }
            />
            <SpainAppointmentNotice />
            <Message text={error} />
          </View>
        }
      />
      <Sheet
        visible={options}
        onClose={() => setOptions(false)}
        title="Liste seçenekleri"
      >
        <Text style={styles.pillText}>İspanya · Turistik vize</Text>
        <Text style={styles.muted}>
          “Hazırladım” işaretleri koşulların sağlandığı veya başvurunun kabul
          edileceği anlamına gelmez.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Çalışma durumunu seç"
          onPress={() => {
            setOptions(false);
            setSelect(true);
          }}
          style={{
            minHeight: 44,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.text}>
            Çalışma durumu:{" "}
            {employmentOptions.find(([v]) => v === employment)?.[1]}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.row}>
          <Switch
            accessibilityLabel="18 yaş altı başvuru hazırlıyorum"
            value={under18}
            onValueChange={setUnder18}
          />
          <Text style={[styles.muted, { flex: 1 }]}>
            18 yaş altı başvuru hazırlıyorum
          </Text>
        </View>
        {under18 && (
          <Text style={styles.muted}>
            12. maddedeki tercüme, apostil ve muvafakat koşullarını özellikle
            kontrol et.
          </Text>
        )}
        <SpainSource />
      </Sheet>
      <Sheet
        visible={select}
        onClose={() => setSelect(false)}
        title="Çalışma durumun"
      >
        {employmentOptions.map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: employment === value }}
            aria-checked={employment === value}
            onPress={() => {
              setEmployment(value);
              setSelect(false);
            }}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={styles.text}>{label}</Text>
            <Ionicons
              name={
                employment === value ? "radio-button-on" : "radio-button-off"
              }
              size={21}
              color={colors.blue}
            />
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
export function GuideSection({
  title,
  children,
  notes,
}: {
  title: string;
  children: React.ReactNode;
  notes?: React.ReactNode;
}) {
  useAppearance();

  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 44,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.heading}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.muted}
        />
      </Pressable>
      {open && children}
      {notes}
    </View>
  );
}
export function SpainGuide({ header }: { header: React.ReactElement }) {
  useAppearance();

  return <ScrollGuide header={header} />;
}
function ScrollGuide({ header }: { header: React.ReactElement }) {
  useAppearance();

  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={spainGuide.overview}
      keyExtractor={(x) => x.title}
      ListHeaderComponent={
        <View style={{ gap: 16, paddingBottom: 16 }}>
          {header}
          <SpainAppointmentNotice />
          <GuideSection title="Resmî kaynaklar">
            <SpainSource />
          </GuideSection>
          <GuideSection
            title="Başvuru Süreci"
            notes={
              <CommunityTips
                country="spain"
                categories={["documents", "doc-form", "other"]}
              />
            }
          >
            <Text style={styles.muted}>Başvuru öncesi evrak kontrolü</Text>
            {spainGuide.process.map((s, i) => (
              <Text key={s} style={styles.text}>
                {i + 1}. {s}
              </Text>
            ))}
          </GuideSection>
          <GuideSection
            title="Randevu"
            notes={
              <CommunityTips country="spain" categories={["appointment"]} />
            }
          >
            <Text style={styles.text}>{spainGuide.appointment}</Text>
            <Button
              label="BLS’den randevu al"
              onPress={() => {
                void Linking.openURL(
                  spainGuide.appointment_update.booking_url,
                ).catch(() => {});
              }}
            />
            <Button
              secondary
              label="Randevu hakkında önemli bilgi paylaş"
              onPress={() =>
                router.push({
                  pathname: "/create",
                  params: {
                    kind: "tip",
                    country: "spain",
                    category: "appointment",
                  },
                })
              }
            />
          </GuideSection>
          <GuideSection
            title="Konaklama ve davet mektubu"
            notes={
              <CommunityTips country="spain" categories={["invitation"]} />
            }
          >
            <Text style={styles.text}>
              {spainGuide.documents.find((d) => d.sort_order === 4)?.body}
            </Text>
            <Button
              secondary
              label="Davet mektubu hakkında önemli bilgi paylaş"
              onPress={() =>
                router.push({
                  pathname: "/create",
                  params: {
                    kind: "tip",
                    country: "spain",
                    category: "invitation",
                  },
                })
              }
            />
          </GuideSection>
          <Text style={styles.heading}>Genel Bakış</Text>
        </View>
      }
      renderItem={({ item }) => (
        <GuideSection
          title={item.title}
          notes={
            item.title === "Başvuru öncesi dikkat" ? (
              <CommunityTips country="spain" categories={["rejection"]} />
            ) : undefined
          }
        >
          <Text style={styles.text}>{item.body}</Text>
        </GuideSection>
      )}
    />
  );
}
