import { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { db, configured } from "../src/lib/supabase";
import { signupSchema } from "../src/lib/schemas";
import { styles, Button, Chip, Field, Message } from "../src/components/ui";
export default function Auth() {
  const callbackUrl = Linking.useURL();
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(
    "login",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!callbackUrl || !configured) return;
    const url = new URL(callbackUrl);
    const hash = new URLSearchParams(url.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (access_token && refresh_token) {
      void db()
        .auth.setSession({ access_token, refresh_token })
        .then((r) => {
          if (r.error) setMessage("Bağlantının süresi dolmuş olabilir.");
          else if (
            hash.get("type") === "recovery" ||
            url.searchParams.get("recovery")
          )
            setMode("reset");
          else setMessage("E-posta adresin doğrulandı.");
        });
    }
  }, [callbackUrl]);
  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      username: "",
      terms: false,
      privacy: false,
    },
  });
  async function submit(v: {
    email: string;
    password: string;
    display_name: string;
    username: string;
    terms: boolean;
    privacy: boolean;
  }) {
    if (!configured) {
      setMessage("Supabase bağlantısı henüz kurulmadı.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(v);
        if (!parsed.success) {
          setMessage(
            "Adını, 3–24 karakter kullanıcı adını, e-postanı ve en az 12 karakter şifreni kontrol et. Koşullar ve gizlilik onayı gerekli.",
          );
          return;
        }
        const r = await db().auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            data: {
              display_name: v.display_name,
              username: v.username,
              terms_accepted: true,
              privacy_accepted: true,
            },
            emailRedirectTo: Linking.createURL("/auth"),
          },
        });
        if (r.error) throw r.error;
        setMessage("Doğrulama bağlantısı için e-postanı kontrol et.");
      } else if (mode === "forgot") {
        const r = await db().auth.resetPasswordForEmail(v.email, {
          redirectTo: Linking.createURL("/auth?recovery=1"),
        });
        if (r.error) throw r.error;
        setMessage("Hesap mevcutsa sıfırlama bağlantısı e-postana gönderildi.");
      } else if (mode === "reset") {
        if (v.password.length < 12) {
          setMessage("En az 12 karakter şifre kullan.");
          return;
        }
        const r = await db().auth.updateUser({ password: v.password });
        if (r.error) throw r.error;
        setMessage("Şifren güncellendi.");
      } else {
        const r = await db().auth.signInWithPassword({
          email: v.email,
          password: v.password,
        });
        if (r.error) throw r.error;
        router.replace("/");
      }
    } catch {
      setMessage("İşlem tamamlanamadı. Bilgilerini ve bağlantını kontrol et.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Rotan ortak, deneyimin özel.</Text>
        <Text style={styles.text}>Sor, paylaş, birlikte yol al.</Text>
        <View style={styles.row}>
          {(["login", "signup", "forgot", "reset"] as const).map((x) => (
            <Chip
              key={x}
              label={
                {
                  login: "Giriş yap",
                  signup: "Üye ol",
                  forgot: "Şifremi unuttum",
                  reset: "Yeni şifre",
                }[x]
              }
              active={mode === x}
              onPress={() => setMode(x)}
            />
          ))}
        </View>
        {mode === "signup" &&
          (["display_name", "username"] as const).map((name) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field: { onChange, value } }) => (
                <Field
                  label={name === "username" ? "Kullanıcı adı" : "Görünen ad"}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize={name === "username" ? "none" : "words"}
                />
              )}
            />
          ))}
        {mode !== "reset" && (
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Field
                label="E-posta"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            )}
          />
        )}
        {mode !== "forgot" && (
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Field
                label="Şifre"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
              />
            )}
          />
        )}
        {mode === "signup" && (
          <>
            <Button
              secondary
              label="Kullanım koşulları ve gizlilik"
              onPress={() => router.push("/settings")}
            />
            {(["terms", "privacy"] as const).map((name) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { value, onChange } }) => (
                  <View style={styles.row}>
                    <Switch
                      accessibilityLabel={
                        name === "terms"
                          ? "Kullanım koşullarını kabul ediyorum"
                          : "Gizlilik politikasını kabul ediyorum"
                      }
                      value={value}
                      onValueChange={onChange}
                    />
                    <Text style={[styles.text, { flex: 1 }]}>
                      {name === "terms"
                        ? "Kullanım koşullarını kabul ediyorum."
                        : "Gizlilik politikasını kabul ediyorum."}
                    </Text>
                  </View>
                )}
              />
            ))}
          </>
        )}
        <Message text={message} />
        <Button
          label={
            busy
              ? "Bir saniye…"
              : mode === "signup"
                ? "Topluluğa katıl"
                : mode === "login"
                  ? "Giriş yap"
                  : mode === "reset"
                    ? "Şifreyi güncelle"
                    : "Sıfırlama bağlantısı gönder"
          }
          disabled={busy}
          onPress={() => void handleSubmit(submit)()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
