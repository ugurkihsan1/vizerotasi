import { useState } from "react";
import { ScrollView, Text, View, Switch } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { db } from "../src/lib/supabase";
import { styles, Button, Field, Message } from "../src/components/ui";
export default function Settings() {
  const { profile, session } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [message, setMessage] = useState("");
  const cache = useQueryClient();
  const prefs = useQuery({
    queryKey: ["preferences", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const r = await db()
        .from("notification_preferences")
        .select("*")
        .eq("user_id", session!.user.id)
        .single();
      if (r.error) throw r.error;
      return r.data;
    },
  });
  async function avatar() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage("Fotoğraf seçmek için galeri izni gerekli.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2097152) {
        setMessage("En fazla 2 MB fotoğraf seç.");
        return;
      }
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const path = `${session!.user.id}/${Date.now()}.${asset.mimeType === "image/png" ? "png" : "jpg"}`;
      const upload = await db()
        .storage.from("avatars")
        .upload(path, bytes, { contentType: asset.mimeType ?? "image/jpeg" });
      if (upload.error) throw upload.error;
      const url = db().storage.from("avatars").getPublicUrl(path)
        .data.publicUrl;
      const update = await db()
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", session!.user.id);
      if (update.error) throw update.error;
      await cache.invalidateQueries({ queryKey: ["profile"] });
      setMessage("Fotoğrafın güncellendi.");
    } catch {
      setMessage("Fotoğraf yüklenemedi.");
    }
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {profile && (
        <>
          <Text style={styles.title}>Kendi rotanı düzenle</Text>
          <Button
            secondary
            label="Profil fotoğrafını değiştir"
            onPress={() => void avatar()}
          />
          <Field
            label="Görünen ad"
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
          <Field
            label="Kendinden bahset"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={300}
          />
          <Button
            label="Profili kaydet"
            onPress={() => {
              if (name.trim().length < 2) {
                setMessage("Adın en az 2 karakter olmalı.");
                return;
              }
              void db()
                .from("profiles")
                .update({ display_name: name.trim(), bio })
                .eq("id", profile.id)
                .then((r) => {
                  setMessage(
                    r.error ? "Profil kaydedilemedi." : "Profilin güncellendi.",
                  );
                  void cache.invalidateQueries({ queryKey: ["profile"] });
                });
            }}
          />
          <Text style={styles.heading}>Bildirim tercihleri</Text>
          {Object.entries({
            replies: "Yanıtlar",
            approvals: "İçerik onayları",
            country_updates: "Ülke güncellemeleri",
            badges: "Rozetler",
          }).map(([k, l]) => (
            <View key={k} style={styles.row}>
              <Switch
                accessibilityLabel={l}
                value={prefs.data?.[k] ?? true}
                onValueChange={(v) => {
                  void db()
                    .from("notification_preferences")
                    .update({ [k]: v })
                    .eq("user_id", profile.id)
                    .then((r) => {
                      if (r.error) setMessage("Tercihler güncellenemedi.");
                      else void prefs.refetch();
                    });
                }}
              />
              <Text style={styles.text}>{l}</Text>
            </View>
          ))}
          <Button
            secondary
            label="Çıkış yap"
            onPress={() => {
              void db()
                .auth.signOut()
                .then(({ error }) => {
                  if (error) setMessage("Çıkış yapılamadı.");
                  else router.replace("/");
                });
            }}
          />
        </>
      )}
      <Message text={message} />
      <Button
        secondary
        label="Fotoğraf kaynakları"
        onPress={() => router.push("/photo-credits")}
      />
      <View style={styles.card}>
        <Text style={styles.heading}>Vize Rotası hakkında</Text>
        <Text style={styles.text}>
          Bu uygulama resmî bir konsolosluk, büyükelçilik veya vize başvuru
          merkezi değildir. Kullanıcı deneyimleri kişisel tecrübelere dayanır.
          Başvuru koşulları değişebileceğinden resmî kaynakları kontrol etmeni
          öneririz.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Gizlilik ve topluluk kuralları</Text>
        <Text style={styles.text}>
          Paylaşımların ve yorumların onaylandıktan sonra herkese görünür.
          E-posta adresin profilinde gösterilmez. Pasaport, kimlik, banka
          belgesi ve üçüncü kişilerin özel bilgilerini paylaşma. Spam, taciz ve
          yanıltıcı bilgiler yasaktır. İçerikler yayın öncesinde incelenir.
        </Text>
        <Text style={styles.muted}>
          Yayın öncesinde veri sorumlusu, saklama süreleri, hesap silme ve
          iletişim bilgilerini içeren hukuki metinlerin tamamlanması gerekir.
        </Text>
      </View>
    </ScrollView>
  );
}
