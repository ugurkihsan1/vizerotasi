import { DeleteAccount } from "../src/components/DeleteAccount";
import { Ionicons } from "@expo/vector-icons";
import { webPath } from "../src/lib/web-path";
import * as Linking from "expo-linking";
import { pendingCleanup, cleanupEvidence } from "../src/lib/content-cleanup";
import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Switch,
  Platform,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pickAvatar, uploadAvatar } from "../src/lib/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { db } from "../src/lib/supabase";
import { useAppearance, setPreferences } from "../src/lib/appearance";
import {
  styles,
  colors,
  Button,
  Field,
  Message,
  Chip,
  Sheet,
} from "../src/components/ui";
function SettingsSection({
  title,
  icon,
  children,
}: React.PropsWithChildren<{
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}>) {
  useAppearance();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => setOpen(true)}
        style={[
          styles.card,
          { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.blue} />
        <Text style={[styles.pillText, { flex: 1 }]}>{title}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  );
}
export default function Settings() {
  useAppearance();
  const { profile } = useAuth();
  return <SettingsBody key={profile?.id ?? "guest"} />;
}
function SettingsBody() {
  const { profile, session, avatarNotice } = useAuth(),
    appearance = useAppearance(),
    cache = useQueryClient();
  const [name, setName] = useState(profile?.display_name ?? ""),
    [bio, setBio] = useState(profile?.bio ?? ""),
    [message, setMessage] = useState(""),
    [privacy, setPrivacy] = useState(false);
  const [email, setEmail] = useState(session?.user.email ?? ""),
    [accountBusy, setAccountBusy] = useState(false);
  const emailRedirect = () =>
    Platform.OS === "web"
      ? `${window.location.origin}${webPath("/auth")}`
      : Linking.createURL("/auth");
  async function changeEmail() {
    if (accountBusy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage("Geçerli e-posta adresi gir.");
      return;
    }
    setAccountBusy(true);
    const r = await db().auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: emailRedirect() },
    );
    setAccountBusy(false);
    setMessage(
      r.error
        ? "E-posta değiştirilemedi. Yeniden giriş yapıp dene."
        : "E-posta değişikliği için gelen onay bağlantılarını tamamla.",
    );
  }
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
  const cleanup = useQuery({
    queryKey: ["pending-cleanup", session?.user.id],
    enabled: !!session,
    queryFn: () => pendingCleanup(session!.user.id),
  });
  const preference = (value: Parameters<typeof setPreferences>[0]) =>
    void setPreferences(value).catch(() =>
      setMessage("Ayar cihazına kaydedilemedi."),
    );
  async function avatar() {
    try {
      const selected = await pickAvatar();
      if (!selected || !session) return;
      await uploadAvatar(selected, session.user.id);
      await cache.invalidateQueries({ queryKey: ["profile"] });
      setMessage("Fotoğrafın güncellendi.");
    } catch {
      setMessage("Fotoğraf yüklenemedi.");
    }
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SettingsSection title="Görünüm" icon="contrast-outline">
        <View style={styles.row}>
          {(
            [
              ["system", "Sistem"],
              ["light", "Açık"],
              ["dark", "Karanlık"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              active={appearance.theme === value}
              onPress={() => preference({ theme: value })}
            />
          ))}
        </View>
        <View style={styles.card}>
          {(
            [
              ["largeText", "Büyük yazı"],
              ["reducedMotion", "Hareketi azalt"],
              ["haptics", "Dokunsal geri bildirim"],
            ] as const
          ).map(([key, label]) => (
            <View
              key={key}
              style={[styles.row, { justifyContent: "space-between" }]}
            >
              <Text style={styles.text}>{label}</Text>
              <Switch
                accessibilityLabel={label}
                value={appearance[key]}
                onValueChange={(v) => preference({ [key]: v })}
              />
            </View>
          ))}
        </View>
      </SettingsSection>
      {profile && (
        <>
          <SettingsSection title="Profili düzenle" icon="person-outline">
            <Message text={message || avatarNotice || ""} />
            <Button
              secondary
              label="Profil fotoğrafını değiştir"
              onPress={() => void avatar()}
            />
            <Field
              label="Adınız"
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <Field
              label="Biyografi"
              value={bio}
              onChangeText={setBio}
              maxLength={300}
              multiline
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
                      r.error
                        ? "Profil kaydedilemedi."
                        : "Profilin güncellendi.",
                    );
                    void cache.invalidateQueries({ queryKey: ["profile"] });
                  });
              }}
            />
          </SettingsSection>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Rozetlerim ve ilerlemem"
            onPress={() => router.push("/badges")}
            style={[
              styles.card,
              {
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              },
            ]}
          >
            <Ionicons name="ribbon-outline" size={22} color={colors.blue} />
            <Text style={[styles.pillText, { flex: 1 }]}>
              Rozetlerim ve ilerlemem
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          <SettingsSection title="Bildirimler" icon="notifications-outline">
            <View style={styles.card}>
              {Object.entries({
                replies: "Yanıtlar",
                approvals: "İçerik onayları",
                country_updates: "Ülke güncellemeleri",
                badges: "Rozetler",
              }).map(([key, label]) => (
                <View
                  key={key}
                  style={[styles.row, { justifyContent: "space-between" }]}
                >
                  <Text style={styles.text}>{label}</Text>
                  <Switch
                    accessibilityLabel={label}
                    value={prefs.data?.[key] ?? true}
                    onValueChange={(value) =>
                      void db()
                        .from("notification_preferences")
                        .update({ [key]: value })
                        .eq("user_id", profile.id)
                        .then((r) =>
                          r.error
                            ? setMessage("Tercih kaydedilemedi.")
                            : void prefs.refetch(),
                        )
                    }
                  />
                </View>
              ))}
            </View>
          </SettingsSection>
          <SettingsSection title="Hesap ve güvenlik" icon="lock-closed-outline">
            <Message text={message} />
            <Field
              label="Yeni e-posta adresi"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
            />
            <Button
              label="E-postayı değiştir"
              disabled={accountBusy || email.trim() === session?.user.email}
              onPress={() => void changeEmail()}
            />
            <Text style={styles.muted}>
              E-posta değişikliği, gelen onay bağlantıları tamamlanınca geçerli
              olur.
            </Text>
            <Button
              secondary
              label="Engellenen kişiler"
              onPress={() =>
                router.push({ pathname: "/messages", params: { blocks: "1" } })
              }
            />
            <Button
              secondary
              label="Şifre sıfırlama bağlantısı gönder"
              onPress={() => {
                if (!session?.user.email) return;
                void db()
                  .auth.resetPasswordForEmail(session.user.email, {
                    redirectTo:
                      Platform.OS === "web"
                        ? `${window.location.origin}${webPath("/auth")}?recovery=1`
                        : Linking.createURL("/auth", {
                            queryParams: { recovery: "1" },
                          }),
                  })
                  .then((r) =>
                    setMessage(
                      r.error
                        ? "Bağlantı gönderilemedi."
                        : "Şifre sıfırlama bağlantısı e-posta adresine gönderildi.",
                    ),
                  );
              }}
            />
            <DeleteAccount />
          </SettingsSection>
          {profile.role !== "user" && (
            <SettingsSection title="Yönetim" icon="shield-checkmark-outline">
              <Button
                secondary
                label="Moderasyon kuyruğu"
                onPress={() => router.push("/moderation")}
              />
              {profile.role === "admin" && (
                <>
                  <Button
                    secondary
                    label="Ülkeleri yönet"
                    onPress={() => router.push("/admin-countries")}
                  />
                  <Button
                    secondary
                    label="İçerik ve üye yönetimi"
                    onPress={() => router.push("/admin")}
                  />
                </>
              )}
            </SettingsSection>
          )}
        </>
      )}
      <SettingsSection title="Veri ve uygulama" icon="options-outline">
        <Message text={message} />
        {session && !!cleanup.data?.length && (
          <Button
            secondary
            label="Bekleyen ek dosyaları temizle"
            onPress={() =>
              void cleanupEvidence(session.user.id)
                .then(() => {
                  void cleanup.refetch();
                  setMessage("Dosyalar temizlendi.");
                })
                .catch(() => setMessage("Dosya temizliği tamamlanamadı."))
            }
          />
        )}
        <Button
          secondary
          label="Arama geçmişini temizle"
          onPress={() => {
            void AsyncStorage.removeItem(
              `recent-searches:${session?.user.id ?? "guest"}`,
            )
              .then(() => setMessage("Arama geçmişi temizlendi."))
              .catch(() => setMessage("Geçmiş temizlenemedi."));
          }}
        />
        <Button
          secondary
          label="İçerikleri yenile"
          onPress={() => {
            void cache
              .invalidateQueries()
              .then(() => setMessage("İçerikler güncellendi."));
          }}
        />
        <Button
          secondary
          label="Gizlilik ve topluluk kuralları"
          onPress={() => setPrivacy(true)}
        />
        <Button
          secondary
          label="Destek ve iletişim"
          onPress={() => {
            void Linking.openURL(
              "mailto:vizeselapp@gmail.com?subject=Vizesel%20Destek",
            ).catch(() =>
              setMessage(
                "E-posta uygulaması açılamadı. vizeselapp@gmail.com adresinden bize ulaşabilirsin.",
              ),
            );
          }}
        />
        <Button
          secondary
          label="Fotoğraf kaynakları"
          onPress={() => router.push("/photo-credits")}
        />
      </SettingsSection>
      <Message text={message || avatarNotice || ""} />
      {session && (
        <Button
          secondary
          label="Çıkış yap"
          onPress={() =>
            void db()
              .auth.signOut()
              .then((r) =>
                r.error ? setMessage("Çıkış yapılamadı.") : router.replace("/"),
              )
          }
        />
      )}
      <Sheet
        visible={privacy}
        onClose={() => setPrivacy(false)}
        title="Gizlilik ve topluluk"
      >
        <Text style={styles.text}>
          E-posta adresin profilinde gösterilmez. Paylaşımlarında kimlik ve
          banka bilgisi paylaşma. Topluluk deneyimleri resmî vize bilgisi
          değildir.
        </Text>
        <Text style={styles.muted}>
          Özel belgeler yalnız sen ve yetkili yönetim tarafından görülebilir.
          Spam, taciz ve yanıltıcı içerik yasaktır.
        </Text>
      </Sheet>
    </ScrollView>
  );
}
