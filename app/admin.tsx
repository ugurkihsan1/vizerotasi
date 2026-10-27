import { useAppearance } from "../src/lib/appearance";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { db } from "../src/lib/supabase";
import { useAuth } from "../src/lib/auth";
import { useCountries } from "../src/lib/data";
import {
  styles,
  Button,
  Field,
  Chip,
  Empty,
  Message,
} from "../src/components/ui";
export default function Admin() {
  useAppearance();

  const { profile } = useAuth();
  const { data: countries } = useCountries();
  const [country, setCountry] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [source, setSource] = useState("");
  const [user, setUser] = useState("");
  const [role, setRole] = useState("moderator");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [tipId, setTipId] = useState("");
  const [sourceType, setSourceType] = useState("editorial");
  const [busy, setBusy] = useState(false);
  async function run(action: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    setMessage("");
    try {
      const r = await action();
      if (r.error) throw r.error;
      setMessage("Değişiklik kaydedildi.");
    } catch {
      setMessage("Kaydedilemedi. Alanları ve yetkini kontrol et.");
    } finally {
      setBusy(false);
    }
  }
  if (profile?.role !== "admin")
    return <Empty title="Bu alan yöneticilere özel" />;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Topluluk yönetimi</Text>
      <Button
        secondary
        label="Belge uyarılarını yönet"
        onPress={() => router.push("/document-notes")}
      />
      <Button
        secondary
        label="Ülke ekle / düzenle"
        onPress={() => router.push("/admin-countries")}
      />
      <Message text={message} />
      <View style={styles.card}>
        <Text style={styles.heading}>Ülke belgesi ekle</Text>
        <View style={styles.row}>
          {countries?.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={country === c.id}
              onPress={() => setCountry(c.id)}
            />
          ))}
        </View>
        <Field label="Belge başlığı" value={title} onChangeText={setTitle} />
        <Field
          label="Kısa kontrol listesi / açıklama"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <Field
          label="Resmî kaynak URL (https)"
          value={source}
          onChangeText={setSource}
          autoCapitalize="none"
        />
        <Button
          label="Belgeyi ekle"
          disabled={busy || !country || !title || !body}
          onPress={() =>
            void run(() =>
              db()
                .from("country_documents")
                .insert({
                  country_id: country,
                  title,
                  body,
                  source_url: source || null,
                }),
            )
          }
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>
          Önemli bilgiyi düzenle ve kaynağını doğrula
        </Text>
        <Text style={styles.muted}>
          İpucu önce paylaşım ekranından oluşturulur. Düzenleme sonrasında
          tekrar moderasyon onayı gerekir.
        </Text>
        <Field
          label="Önemli bilgi kimliği (UUID)"
          value={tipId}
          onChangeText={setTipId}
        />
        <Field label="Yeni başlık" value={title} onChangeText={setTitle} />
        <Field
          label="Yeni içerik"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <View style={styles.row}>
          {["official", "editorial", "community_verified"].map((s) => (
            <Chip
              key={s}
              label={
                {
                  official: "Resmî kaynak",
                  editorial: "Editör notu",
                  community_verified: "Topluluk doğrulaması",
                }[s]!
              }
              active={sourceType === s}
              onPress={() => setSourceType(s)}
            />
          ))}
        </View>
        <Field label="Kaynak URL" value={source} onChangeText={setSource} />
        <Button
          label="İncelemeye gönder"
          disabled={busy}
          onPress={() =>
            void run(() =>
              db().rpc("admin_edit_tip", {
                target: tipId,
                new_title: title,
                new_body: body,
                new_source_type: sourceType,
                new_source_url: source || null,
              }),
            )
          }
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Üye yönetimi</Text>
        <Field label="Üye kimliği (UUID)" value={user} onChangeText={setUser} />
        <View style={styles.row}>
          {["user", "moderator", "admin"].map((r) => (
            <Chip
              key={r}
              label={
                { user: "Üye", moderator: "Moderatör", admin: "Yönetici" }[r]!
              }
              active={role === r}
              onPress={() => setRole(r)}
            />
          ))}
        </View>
        <Button
          label="Rolü değiştir"
          disabled={busy}
          onPress={() =>
            void run(() =>
              db().rpc("admin_set_role", { target_user: user, new_role: role }),
            )
          }
        />
        <Field
          label="Puan değişimi (eksi olabilir)"
          value={points}
          onChangeText={setPoints}
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="İşlem gerekçesi (en az 5 karakter)"
          value={reason}
          onChangeText={setReason}
        />
        <Text style={styles.muted}>
          Aynı üye ve gerekçeyle gönderilen işlem yeniden puan vermez.
        </Text>
        <Button
          label="Puan düzenlemesini kaydet"
          disabled={
            busy || !Number.isInteger(Number(points)) || reason.length < 5
          }
          onPress={() =>
            void run(() =>
              db().rpc("admin_adjust_reputation", {
                target_user: user,
                delta: Number(points),
                reason,
                event_key: `${user}:${reason}`,
              }),
            )
          }
        />
      </View>
    </ScrollView>
  );
}
