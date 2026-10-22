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
  const [error, setError] = useState("");
  return (
    <View style={[styles.card, { backgroundColor: "#EDF3FC", gap: 8 }]}>
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
              ? `${window.location.origin}${path}`
              : `https://delicate-scone-eeabc7.netlify.app${path}`,
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
  const [open, setOpen] = useState(false);
  const [community, setCommunity] = useState(false);
  const sections = sectionsFor(doc, employment);
  return (
    <View style={[styles.card, { padding: 16, gap: open ? 14 : 0 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          aria-expanded={open}
          accessibilityLabel={`${doc.sort_order}. ${doc.title}`}
          onPress={() => setOpen(!open)}
          style={{
            flex: 1,
            minHeight: 54,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.blue, width: 22 }}>
            {doc.sort_order}
          </Text>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.pillText}>{doc.title}</Text>
            <Text style={styles.muted}>
              {doc.requirement === "conditional" ? "Duruma bağlı" : "Zorunlu"}
            </Text>
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
            minHeight: 54,
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
                backgroundColor: "#FFF7E8",
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
          <Text style={[styles.muted, { fontSize: 11 }]}>
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
  const q = useDocuments("spain");
  const documents = mergeSpainDocuments(q.data ?? []);
  const { session } = useAuth();
  const key = `spain-tourism-checklist:v1:${session?.user.id ?? "guest"}`;
  const [ready, setReady] = useState<string[]>([]);
  const [employment, setEmployment] = useState("");
  const [select, setSelect] = useState(false);
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
            <Text style={styles.heading}>
              İspanya C Tipi Turistik Vize – Gerekli Belgeler
            </Text>
            <Text style={styles.muted}>
              BLS International İspanya İstanbul Vize Başvuru Merkezi evrak
              listesi esas alınarak, kaynak dokümandaki sırayla hazırlanmıştır.
            </Text>
            <View style={styles.card}>
              <Text style={styles.pillText}>
                {completed} / 13 belge işaretlendi
              </Text>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Belge hazırlık ilerlemesi"
                accessibilityValue={{ min: 0, max: 13, now: completed }}
                aria-valuemin={0}
                aria-valuemax={13}
                aria-valuenow={completed}
                style={{
                  height: 7,
                  backgroundColor: "#E3EAF4",
                  borderRadius: 4,
                }}
              >
                <View
                  style={{
                    height: 7,
                    width: `${(completed / 13) * 100}%`,
                    backgroundColor: colors.green,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={styles.muted}>
                “Hazırladım” işaretleri koşulların sağlandığı veya başvurunun
                kabul edileceği anlamına gelmez.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Çalışma durumunu seç"
                onPress={() => setSelect(true)}
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
                  12. maddedeki tercüme, apostil ve muvafakat koşullarını
                  özellikle kontrol et.
                </Text>
              )}
            </View>
            <Message text={error} />
            <SpainSource />
          </View>
        }
      />
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
function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
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
    </View>
  );
}
export function SpainGuide({ header }: { header: React.ReactElement }) {
  return <ScrollGuide header={header} />;
}
function ScrollGuide({ header }: { header: React.ReactElement }) {
  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={spainGuide.overview}
      keyExtractor={(x) => x.title}
      ListHeaderComponent={
        <View style={{ gap: 16, paddingBottom: 16 }}>
          {header}
          <SpainSource />
          <GuideSection title="Başvuru Süreci">
            <Text style={styles.muted}>Başvuru öncesi evrak kontrolü</Text>
            {spainGuide.process.map((s, i) => (
              <Text key={s} style={styles.text}>
                {i + 1}. {s}
              </Text>
            ))}
          </GuideSection>
          <GuideSection title="Randevu">
            <Text style={styles.text}>{spainGuide.appointment}</Text>
          </GuideSection>
          <Text style={styles.heading}>Genel Bakış</Text>
        </View>
      }
      renderItem={({ item }) => (
        <GuideSection title={item.title}>
          <Text style={styles.text}>{item.body}</Text>
        </GuideSection>
      )}
    />
  );
}
