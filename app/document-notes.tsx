import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../src/lib/supabase";
import { useAuth } from "../src/lib/auth";
import { useCountries, useDocuments, friendlyError } from "../src/lib/data";
import { mergeSpainDocuments } from "../src/lib/spain";
import { CriticalNotice } from "../src/components/CriticalNotice";
import {
  styles,
  Button,
  Field,
  Chip,
  Empty,
  Message,
  Sheet,
} from "../src/components/ui";
import { privacyWarning } from "../src/lib/schemas";
import type { DocumentNote } from "../src/lib/document-notes";
export default function NotesManager() {
  const { profile, session } = useAuth();
  const { data: countries } = useCountries();
  const [country, setCountry] = useState("spain");
  const documents = useDocuments(country);
  const docs =
    country === "spain"
      ? mergeSpainDocuments(documents.data ?? [])
      : (documents.data ?? []);
  const [selected, setSelected] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState("");
  const [source, setSource] = useState<"experience" | "editorial">(
    "experience",
  );
  const [post, setPost] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    id: string;
    decision: string;
  } | null>(null);
  const cache = useQueryClient();
  const staff = profile?.role === "admin" || profile?.role === "moderator";
  const queue = useQuery({
    queryKey: ["document-note-queue", country],
    enabled: !!staff,
    queryFn: async () => {
      const r = await db()
        .from("document_notes")
        .select("*")
        .eq("country_id", country)
        .order("created_at", { ascending: false })
        .limit(50);
      if (r.error) throw r.error;
      return r.data as DocumentNote[];
    },
  });
  async function submit() {
    const doc = docs.find((d) => d.id === selected);
    if (!doc || title.trim().length < 5 || body.trim().length < 20) {
      setMessage(
        "Belgeyi seç; başlığı en az 5, açıklamayı en az 20 karakter yaz.",
      );
      return;
    }
    if (source === "experience" && !post.trim()) {
      setMessage("Gerçek, onaylı kaynak deneyimin kimliğini ekle.");
      return;
    }
    setBusy(true);
    try {
      const base = {
        country_id: country,
        document_title: doc.title,
        title: title.trim(),
        body: body.trim(),
        scope: scope.trim(),
        source_type: source,
        post_id: source === "experience" ? post.trim() : null,
        created_by: session!.user.id,
      };
      const key =
        country === "spain"
          ? `spain-tourism-${"sort_order" in doc ? doc.sort_order : ""}`
          : null;
      const r = await db()
        .from("document_notes")
        .insert({
          ...base,
          document_id: key ? null : doc.id,
          document_key: key,
        });
      if (r.error) throw r.error;
      setTitle("");
      setBody("");
      setPost("");
      setMessage("Belge notu incelemeye alındı.");
      void queue.refetch();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function decide() {
    if (!confirm) return;
    setBusy(true);
    const r = await db().rpc("moderate_document_note", {
      target: confirm.id,
      decision: confirm.decision,
    });
    setBusy(false);
    if (r.error) setMessage(friendlyError(r.error));
    else {
      setConfirm(null);
      void cache.invalidateQueries({ queryKey: ["document-notes"] });
      void queue.refetch();
    }
  }
  if (!staff) return <Empty title="Bu alan moderasyon ekibine özel" />;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Belgeye bağlı kritik notlar</Text>
      <Text style={styles.muted}>
        Kullanıcı aktarımı için aynı ülkeye ait onaylı, gerçek bir deneyim
        gerekir. Editör notları ayrı etiketlenir. Deneyim veya benzer bildirim
        sayısı elle girilmez.
      </Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
        {countries?.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            active={country === c.id}
            onPress={() => {
              setCountry(c.id);
              setSelected("");
            }}
          />
        ))}
      </ScrollView>
      <Text style={styles.heading}>Belge seç</Text>
      <View style={styles.row}>
        {docs.map((d) => (
          <Chip
            key={d.id}
            label={d.title}
            active={selected === d.id}
            onPress={() => setSelected(d.id)}
          />
        ))}
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Chip
            label="Kullanıcı aktarımı"
            active={source === "experience"}
            onPress={() => setSource("experience")}
          />
          <Chip
            label="Editör notu"
            active={source === "editorial"}
            onPress={() => setSource("editorial")}
          />
        </View>
        {source === "experience" && (
          <Field
            label="Kaynak onaylı deneyim kimliği (UUID)"
            value={post}
            onChangeText={setPost}
          />
        )}
        <Field
          label="Kısa uyarı başlığı"
          value={title}
          onChangeText={setTitle}
        />
        <Field
          label="Açıklama"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={3000}
        />
        <Text style={styles.muted}>{privacyWarning}</Text>
        <Field
          label="Kapsam (merkez, vize türü veya özel durum)"
          value={scope}
          onChangeText={setScope}
        />
        <Button
          label="İncelemeye gönder"
          disabled={busy}
          onPress={() => void submit()}
        />
      </View>
      <Message text={message} />
      {queue.isError && (
        <Text style={styles.muted}>
          Belge notları yüklenemedi. Topluluk veritabanı güncellemesinin
          uygulandığını kontrol et.
        </Text>
      )}
      <Text style={styles.heading}>Son belge notları</Text>
      {queue.data?.map((n) => (
        <View key={n.id} style={{ gap: 8 }}>
          <CriticalNotice title={n.title} source={n.source_type} initiallyOpen>
            <Text style={styles.muted}>
              {n.document_title} ·{" "}
              {n.status === "pending"
                ? "Onay bekliyor"
                : n.status === "approved"
                  ? "Yayında"
                  : "Yayında değil"}
            </Text>
            <Text style={styles.text}>{n.body}</Text>
          </CriticalNotice>
          <View style={styles.row}>
            {["approved", "rejected"].map((decision) => (
              <Button
                key={decision}
                label={decision === "approved" ? "Onayla" : "Reddet"}
                secondary={decision !== "approved"}
                disabled={
                  busy ||
                  (n.created_by === profile.id && profile.role !== "admin")
                }
                onPress={() => setConfirm({ id: n.id, decision })}
              />
            ))}
          </View>
        </View>
      ))}
      <Sheet
        visible={!!confirm}
        onClose={() => setConfirm(null)}
        title="Belge notunu değerlendir"
      >
        <Text style={styles.text}>
          Bu karar notun belgeler ekranında görünürlüğünü değiştirir. Kaynak
          doğruluğunu ve kapsamını kontrol et.
        </Text>
        <Button
          label="Kararı kaydet"
          disabled={busy}
          onPress={() => void decide()}
        />
      </Sheet>
    </ScrollView>
  );
}
