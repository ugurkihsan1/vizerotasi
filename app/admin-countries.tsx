import { useAppearance } from "../src/lib/appearance";
import { useState } from "react";
import { ScrollView, View, Text, Switch } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../src/lib/auth";
import { useCountries, useDocuments } from "../src/lib/data";
import { db } from "../src/lib/supabase";
import { CountryPicker } from "../src/components/CountryPicker";
import {
  styles,
  Field,
  Button,
  Message,
  Empty,
  Sheet,
} from "../src/components/ui";
export default function AdminCountries() {
  useAppearance();

  const { profile } = useAuth(),
    countries = useCountries(),
    cache = useQueryClient();
  const [id, setId] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [summary, setSummary] = useState(""),
    [cover, setCover] = useState(""),
    [source, setSource] = useState(""),
    [appointment, setAppointment] = useState(""),
    [schengen, setSchengen] = useState(true),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [doc, setDoc] = useState(false),
    [docId, setDocId] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [docSource, setDocSource] = useState("");
  const docs = useDocuments(selected);
  if (profile?.role !== "admin")
    return <Empty title="Bu alan yöneticilere özel" />;
  function load(cid: string) {
    const c = countries.data?.find((c) => c.id === cid);
    if (!c) return;
    setSelected(cid);
    setId(c.id);
    setName(c.name);
    setCode(c.code);
    setSummary(c.summary ?? "");
    setCover(c.cover_url ?? "");
    setSource(c.source_url ?? "");
    setAppointment(c.appointment_url ?? "");
    setSchengen(c.is_schengen ?? true);
    setError("");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await db().rpc("admin_save_country", {
        payload: {
          id: id.trim(),
          name: name.trim(),
          code: code.toUpperCase(),
          summary,
          cover_url: cover.trim(),
          source_url: source.trim(),
          appointment_url: appointment.trim(),
          is_schengen: schengen,
        },
      });
      if (r.error) throw r.error;
      setSelected(r.data);
      await cache.invalidateQueries({ queryKey: ["countries"] });
      setError("Ülke kaydedildi.");
    } catch (e) {
      setError(
        (e as { code?: string }).code === "PGRST202"
          ? "Ülke yönetimi için veritabanı güncellemesi gerekiyor."
          : "Kaydedilemedi. Ülke kodunu ve bağlantıları kontrol et.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveDoc() {
    setBusy(true);
    try {
      const values = {
        country_id: selected,
        title: title.trim(),
        body: body.trim(),
        source_url: docSource.trim() || null,
      };
      const r = docId
        ? await db()
            .from("country_documents")
            .update(values)
            .eq("id", docId)
            .eq("country_id", selected)
        : await db().from("country_documents").insert(values);
      if (r.error) throw r.error;
      await cache.invalidateQueries({ queryKey: ["documents"] });
      await docs.refetch();
      setDoc(false);
    } catch {
      setError("Belge kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <CountryPicker
        label="Düzenlenecek ülke"
        value={selected}
        onChange={load}
      />
      <Button
        secondary
        label="Yeni ülke"
        onPress={() => {
          setSelected("");
          setId("");
          setName("");
          setCode("");
          setSummary("");
          setCover("");
          setSource("");
          setAppointment("");
        }}
      />
      <View style={styles.card}>
        <Field
          label="Ülke adı"
          value={name}
          onChangeText={setName}
          maxLength={60}
        />
        <Field
          label="İki harfli ülke kodu"
          placeholder="DK"
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            if (!selected) setId(v.toLowerCase());
          }}
          maxLength={2}
          autoCapitalize="characters"
        />
        <Field
          label="Ülke bağlantı adı"
          value={id}
          onChangeText={setId}
          editable={!selected}
          placeholder="denmark"
          autoCapitalize="none"
        />
        <Field
          label="Kısa rehber"
          value={summary}
          onChangeText={setSummary}
          multiline
          maxLength={3000}
        />
        <Field
          label="Fotoğraf bağlantısı (https)"
          value={cover}
          onChangeText={setCover}
          autoCapitalize="none"
        />
        <Field
          label="Resmî kaynak (https)"
          value={source}
          onChangeText={setSource}
          autoCapitalize="none"
        />
        <Field
          label="Randevu bağlantısı (https)"
          value={appointment}
          onChangeText={setAppointment}
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <Switch
            accessibilityLabel="Schengen ülkesi"
            value={schengen}
            onValueChange={setSchengen}
          />
          <Text style={styles.text}>Schengen ülkesi</Text>
        </View>
        <Button
          label="Ülkeyi kaydet"
          disabled={busy || name.trim().length < 2 || code.length !== 2 || !id}
          onPress={() => void save()}
        />
      </View>
      <Message text={error} />
      {!!selected && (
        <>
          <Text style={styles.heading}>Belge listesi</Text>
          <Button
            secondary
            label="Belge ekle"
            onPress={() => {
              setDocId(null);
              setTitle("");
              setBody("");
              setDocSource(source);
              setDoc(true);
            }}
          />
          {docs.data?.map((d) => (
            <Button
              key={d.id}
              secondary
              label={d.title}
              onPress={() => {
                setDocId(d.id);
                setTitle(d.title);
                setBody(d.body);
                setDocSource(d.source_url ?? "");
                setDoc(true);
              }}
            />
          ))}
        </>
      )}
      <Sheet visible={doc} onClose={() => setDoc(false)} title="Belge düzenle">
        <Field label="Belge adı" value={title} onChangeText={setTitle} />
        <Field
          label="Belge açıklaması"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <Field
          label="Belgenin resmî kaynağı (https)"
          value={docSource}
          onChangeText={setDocSource}
        />
        <Message text={error} />
        <Button
          label="Belgeyi kaydet"
          disabled={busy || !title.trim() || !body.trim()}
          onPress={() => void saveDoc()}
        />
      </Sheet>
    </ScrollView>
  );
}
