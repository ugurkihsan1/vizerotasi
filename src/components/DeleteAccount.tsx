import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { useAppearance, isDark } from "../lib/appearance";
import { Button, Field, Message, Sheet, colors, styles } from "./ui";

export function DeleteAccount() {
  useAppearance();
  const { session } = useAuth();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  const confirmed = confirmation.trim().toLocaleUpperCase("tr") === "SİL";
  function close() {
    if (pending.current) return;
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError("");
  }
  async function remove() {
    if (pending.current || !session || !confirmed || !password) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await db().functions.invoke("delete-account", {
        body: { password, confirmation: "SİL" },
      });
      let code = r.data?.code;
      if (r.error?.context?.json) {
        const body = await r.error.context.json().catch(() => null);
        code = body?.code ?? body?.error;
      }
      if (r.error || code !== "deleted") {
        setError(
          code === "invalid_password"
            ? "Şifren doğru değil. Kontrol edip yeniden dene."
            : code === "unauthorized"
              ? "Oturumun sona ermiş. Yeniden giriş yap."
              : code === "NOT_FOUND" || r.error?.context?.status === 404
                ? "Hesap silme şu anda kullanılamıyor. Biraz sonra yeniden dene."
                : "Silme işlemi tamamlanamadı. Yeniden dene; bazı dosyaların kaldırılmış olabilir.",
        );
        return;
      }
      // Only clear the device after the server confirms real Auth/data deletion.
      try {
        const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
          key.split(":").includes(session.user.id),
        );
        if (keys.length) await AsyncStorage.multiRemove(keys);
      } catch {
        /* Server deletion succeeded; local storage must not mask it. */
      }
      await db().auth.signOut({ scope: "local" });
      cache.clear();
      router.replace("/auth");
    } catch {
      setError(
        "Silme sonucu doğrulanamadı. Bağlantını kontrol edip yeniden dene.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      setPassword("");
    }
  }
  if (!session) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          justifyContent: "center",
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ color: colors.red, fontWeight: "600" }}>
          Hesabımı sil
        </Text>
      </Pressable>
      <Sheet visible={open} title="Hesabını sil" onClose={close}>
        <Text style={styles.text}>
          Hesabın, paylaşımların, yorumların, mesajların ve yüklediğin dosyalar
          kalıcı olarak silinir. Bu işlem geri alınamaz.
        </Text>
        <Field
          label="Mevcut şifren"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          editable={!busy}
        />
        <Field
          label="Onaylamak için SİL yaz"
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
        />
        <Message text={error} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            busy ? "Hesabın siliniyor" : "Hesabımı kalıcı olarak sil"
          }
          disabled={busy || !confirmed || !password}
          onPress={() => void remove()}
          style={{
            minHeight: 48,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.red,
            opacity: busy || !confirmed || !password ? 0.45 : 1,
          }}
        >
          <Text
            style={{
              color: isDark() ? colors.bg : "#FFFFFF",
              fontWeight: "700",
            }}
          >
            {busy ? "Hesabın siliniyor…" : "Hesabımı kalıcı olarak sil"}
          </Text>
        </Pressable>
        <View>
          <Button secondary label="Vazgeç" disabled={busy} onPress={close} />
        </View>
      </Sheet>
    </>
  );
}
