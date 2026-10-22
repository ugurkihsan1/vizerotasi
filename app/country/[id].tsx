import {
  SpainDocuments,
  SpainGuide,
} from "../../src/components/SpainDocuments";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/lib/auth";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, FlatList, Linking, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useCountries, useDocuments, useToggle } from "../../src/lib/data";
import { db, configured } from "../../src/lib/supabase";
import { Feed } from "../../src/components/Feed";
import {
  styles,
  Button,
  Chip,
  Sheet,
  useGate,
  Empty,
  Message,
} from "../../src/components/ui";
import type { Document } from "../../src/lib/types";
function Follow({ id }: { id: string }) {
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
    <View style={styles.card}>
      <View style={styles.row}>
        <Chip
          active={checked}
          label={checked ? "✓ Hazır" : "○ Hazırlanacak"}
          onPress={() => {
            setChecked(!checked);
            void AsyncStorage.setItem(checklistKey, String(!checked));
          }}
        />
        <Button secondary label={doc.title} onPress={() => setOpen(true)} />
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title={doc.title}>
        <Text style={styles.text}>{doc.body}</Text>
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState("Akış");
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
      <Text style={{ fontSize: 48 }}>{country?.flag ?? "🌍"}</Text>
      <Text style={styles.title}>{country?.name ?? "Ülke topluluğu"}</Text>
      <Follow id={id} />
      <View style={styles.row}>
        <Text style={styles.pill}>{stats.data?.experiences ?? 0} deneyim</Text>
        <Text style={styles.pill}>{stats.data?.questions ?? 0} soru</Text>
        <Text style={styles.pill}>{stats.data?.tips ?? 0} kritik bilgi</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.muted}>
          ⏱ Topluluğa göre {stats.data?.average_days ?? "—"} gün
        </Text>
        <Text style={styles.muted}>
          🔥 Son 7 gün: {stats.data?.recent ?? 0} paylaşım
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {(id === "spain"
          ? [
              "Akış",
              "Deneyimler",
              "Sorular",
              "Ret Deneyimleri",
              "Belgeler",
              "Rehber",
            ]
          : ["Akış", "Deneyimler", "Sorular", "Kritik", "Belgeler"]
        ).map((t) => (
          <Chip
            key={t}
            label={t}
            active={tab === t}
            onPress={() => setTab(t)}
          />
        ))}
      </ScrollView>
    </View>
  );
  if (id === "spain" && tab === "Belgeler")
    return <SpainDocuments header={header} />;
  if (id === "spain" && tab === "Rehber") return <SpainGuide header={header} />;
  return tab === "Belgeler" ? (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
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
              : tab === "Kritik"
                ? "tip"
                : undefined,
      }}
    />
  );
}
