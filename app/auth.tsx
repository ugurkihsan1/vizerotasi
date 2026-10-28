import { Ionicons } from "@expo/vector-icons";
import { parseAuthCallback } from "../src/lib/auth-callback";
import { webPath } from "../src/lib/web-path";
import { useAppearance, themeColor, textSize } from "../src/lib/appearance";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import {
  pickAvatar,
  avatarPreview,
  savePendingAvatar,
  finishPendingAvatar,
  type AvatarDraft,
} from "../src/lib/avatar";
import { Brand } from "../src/components/Brand";
import { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import {
  db,
  configured,
  supabase,
  initialAuthUrl,
  clearInitialAuthUrl,
} from "../src/lib/supabase";
import { signupSchema } from "../src/lib/schemas";
import { authErrorMessage } from "../src/lib/auth-errors";
import { styles, Button, Field, Message, colors } from "../src/components/ui";
type AuthValues = {
  email: string;
  password: string;
  display_name: string;
  username: string;
  terms: boolean;
  privacy: boolean;
};
type Mode = "login" | "signup" | "forgot" | "reset";
type Confirmation = "checking" | "verified" | "error" | null;
export default function Auth() {
  useAppearance();

  const params = useLocalSearchParams<{ mode?: string; recovery?: string }>();
  const callbackUrl = Linking.useURL();
  const [mode, setMode] = useState<Mode>(
    params.recovery === "1"
      ? "reset"
      : params.mode === "signup"
        ? "signup"
        : "login",
  );
  const [callbackDismissed, setCallbackDismissed] = useState(false);
  const callbackSource = callbackDismissed
    ? null
    : Platform.OS === "web" && parseAuthCallback(initialAuthUrl)
      ? initialAuthUrl
      : callbackUrl;
  const initialCallback = parseAuthCallback(callbackSource);
  const [confirmation, setConfirmation] = useState<Confirmation>(
    initialCallback ? "checking" : null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [photo, setPhoto] = useState<AvatarDraft | null>(null);
  const cache = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<AuthValues>({
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      username: "",
      terms: false,
      privacy: false,
    },
  });
  useEffect(() => {
    const sub = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const callback = parseAuthCallback(callbackSource);
    if (!callback || !supabase) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setConfirmation("checking");
      try {
        if (callback.error) throw { code: callback.error };
        // The web SDK consumes the redirect during initialization. Await its
        // session instead of racing it with another setSession call.
        const result =
          Platform.OS === "web"
            ? await supabase!.auth.getSession()
            : await supabase!.auth.setSession({
                access_token: callback.accessToken!,
                refresh_token: callback.refreshToken!,
              });
        if (result.error) throw result.error;
        if (!result.data.session) throw { code: "otp_expired" };
        if (callback.type === "recovery") {
          if (active) {
            setMode("reset");
            setConfirmation(null);
          }
          return;
        }
        if (callback.type !== "signup" && callback.type !== "email_change") {
          if (active) {
            setConfirmation(null);
            setMessage("Bağlantı açıldı. Devam edebilirsin.");
          }
          return;
        }
        const user = await supabase!.auth.getUser();
        if (user.error) throw user.error;
        if (!user.data.user?.email_confirmed_at) throw { code: "otp_expired" };
        if (active) {
          setMessage("");
          setConfirmation("verified");
        }
      } catch (error) {
        if (active) {
          setMessage(authErrorMessage(error));
          setConfirmation("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [callbackSource]);
  const changeMode = (next: Mode) => {
    setMode(next);
    setConfirmation(null);
    setMessage("");
    setSent(false);
    clearErrors();
  };
  const redirect = () =>
    Platform.OS === "web"
      ? `${window.location.origin}${webPath("/auth")}`
      : Linking.createURL("/auth");
  async function submit(v: AuthValues) {
    if (!configured) {
      setMessage("Üyelik şu anda kullanılamıyor. Biraz sonra yeniden dene.");
      return;
    }
    setBusy(true);
    setMessage("");
    clearErrors();
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({
          ...v,
          email: v.email.trim(),
          username: v.username.trim().toLowerCase(),
          display_name: v.display_name.trim(),
        });
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            const name = issue.path[0] as keyof typeof v;
            const label = {
              display_name: "Adın en az 2 karakter olmalı.",
              username:
                "3–24 karakter kullan; yalnız küçük harf, rakam ve alt çizgi.",
              email: "Geçerli bir e-posta adresi yaz.",
              password: "En az 8 karakter kullan.",
              terms: "Kullanım koşullarını kabul etmelisin.",
              privacy: "Gizlilik politikasını kabul etmelisin.",
            }[name];
            setError(name, { message: label });
          }
          return;
        }
        const value = parsed.data;
        const usernameTaken = async () => {
          const check = await db()
            .from("profiles")
            .select("id")
            .eq("username", value.username)
            .limit(1);
          if (check.error) throw { code: "username_check_failed" };
          return !!check.data?.length;
        };
        if (await usernameTaken()) throw { code: "username_taken" };
        const r = await db().auth.signUp({
          email: value.email,
          password: value.password,
          options: {
            data: {
              display_name: value.display_name,
              username: value.username,
              terms_accepted: true,
              privacy_accepted: true,
            },
            emailRedirectTo: redirect(),
          },
        });
        if (r.error) {
          // The database unique constraint still wins if two signups race.
          // Recheck before attributing a generic Auth database failure to a name.
          if ((r.error.status ?? 0) >= 500) {
            try {
              if (await usernameTaken()) throw { code: "username_taken" };
            } catch (checkError) {
              if ((checkError as { code?: string }).code === "username_taken")
                throw checkError;
            }
          }
          throw r.error;
        }
        let photoNotice = "";
        if (photo && r.data.user) {
          try {
            await savePendingAvatar(r.data.user.id, photo);
            if (r.data.session) {
              await finishPendingAvatar(r.data.user.id);
              await cache.invalidateQueries({ queryKey: ["profile"] });
            }
          } catch {
            photoNotice =
              " Fotoğrafın kaydedilemedi; giriş yaptıktan sonra Ayarlar’dan ekleyebilirsin.";
          }
        }
        if (r.data.session) {
          router.replace("/");
          return;
        }
        setSent(true);
        setMessage(
          "Doğrulama bağlantısını e-postana gönderdik. Spam klasörünü de kontrol et." +
            (photo && !photoNotice
              ? Platform.OS === "web"
                ? " Fotoğrafın bu tarayıcıda saklandı; e-postanı doğrulayıp aynı tarayıcıdan giriş yaptığında profiline eklenecek."
                : " Fotoğrafın bu uygulamada saklandı; e-postanı doğrulayıp bu uygulamadan giriş yaptığında profiline eklenecek."
              : photoNotice),
        );
      } else if (mode === "forgot") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
          setError("email", { message: "Geçerli bir e-posta adresi yaz." });
          return;
        }
        const r = await db().auth.resetPasswordForEmail(v.email.trim(), {
          redirectTo: `${redirect()}?recovery=1`,
        });
        if (r.error) throw r.error;
        setSent(true);
        setMessage(
          "Hesap mevcutsa şifre yenileme bağlantısı e-postana gönderildi.",
        );
      } else if (mode === "reset") {
        if (v.password.length < 8) {
          setError("password", { message: "En az 8 karakter kullan." });
          return;
        }
        const r = await db().auth.updateUser({ password: v.password });
        if (r.error) throw r.error;
        router.replace("/");
      } else {
        const r = await db().auth.signInWithPassword({
          email: v.email.trim(),
          password: v.password,
        });
        if (r.error) throw r.error;
        router.replace("/");
      }
    } catch (e) {
      const text = authErrorMessage(e);
      if (
        mode === "signup" &&
        (e as { code?: string })?.code === "username_taken"
      )
        setError("username", { message: text });
      else setMessage(text);
    } finally {
      setBusy(false);
    }
  }
  if (confirmation)
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.content,
          {
            flexGrow: 1,
            justifyContent: "center",
            maxWidth: 460,
            width: "100%",
            alignSelf: "center",
            gap: 24,
          },
        ]}
      >
        <Brand />
        <View
          style={[styles.card, { padding: 28, gap: 18, alignItems: "center" }]}
        >
          <Ionicons
            name={
              confirmation === "verified"
                ? "checkmark-circle-outline"
                : confirmation === "error"
                  ? "alert-circle-outline"
                  : "mail-outline"
            }
            size={64}
            color={confirmation === "error" ? colors.amber : colors.green}
          />
          <Text style={[styles.title, { textAlign: "center" }]}>
            {confirmation === "verified"
              ? "E-posta adresin doğrulandı"
              : confirmation === "error"
                ? "Bağlantı açılamadı"
                : "E-posta adresin doğrulanıyor"}
          </Text>
          {confirmation === "verified" && (
            <Text style={[styles.muted, { textAlign: "center" }]}>
              Vizesel hesabın hazır.
            </Text>
          )}
          <Message text={message} />
          {confirmation !== "checking" && (
            <View style={{ alignSelf: "stretch" }}>
              <Button
                label="Giriş ekranına dön"
                onPress={() => {
                  // Clear callback parameters without signing the user out of other devices.
                  if (Platform.OS === "web")
                    window.history.replaceState({}, "", webPath("/auth"));
                  clearInitialAuthUrl();
                  setCallbackDismissed(true);
                  changeMode("login");
                  router.replace("/auth");
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    );
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: 460,
            width: "100%",
            alignSelf: "center",
            paddingTop: 32,
            gap: 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingBottom: 8 }}>
          <Brand />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>
            {mode === "signup"
              ? "Topluluğa hoş geldin."
              : mode === "forgot"
                ? "Şifreni yenileyelim."
                : mode === "reset"
                  ? "Yeni bir şifre seç."
                  : "Yeniden hoş geldin."}
          </Text>
          <Text style={styles.muted}>
            {mode === "signup"
              ? "Hesabını oluştur, deneyimini paylaş ve rotanı kaydet."
              : mode === "login"
                ? "Kaldığın yerden devam et."
                : "Hesabına güvenle geri dön."}
          </Text>
        </View>
        {["login", "signup"].includes(mode) && !sent && (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: themeColor("#E8EEF7", "surface"),
              borderRadius: 14,
              padding: 4,
            }}
          >
            {(["login", "signup"] as const).map((x) => (
              <Pressable
                key={x}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === x }}
                aria-selected={mode === x}
                onPress={() => changeMode(x)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor:
                    mode === x ? themeColor("#FFF", "surface") : "transparent",
                  borderRadius: 11,
                }}
              >
                <Text
                  style={{
                    color: colors.navy,
                    fontWeight: mode === x ? "700" : "400",
                  }}
                >
                  {x === "login" ? "Giriş yap" : "Üye ol"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {!sent && (
          <>
            {mode === "signup" && (
              <View style={{ alignItems: "center", gap: 8 }}>
                {photo && (
                  <Image
                    source={{ uri: avatarPreview(photo) }}
                    style={{ width: 84, height: 84, borderRadius: 42 }}
                    accessibilityLabel="Seçilen profil fotoğrafı"
                  />
                )}
                <Button
                  secondary
                  label={
                    photo
                      ? "Profil fotoğrafını değiştir"
                      : "Profil fotoğrafı ekle (isteğe bağlı)"
                  }
                  onPress={() =>
                    void pickAvatar()
                      .then((p) => {
                        if (p) setPhoto(p);
                      })
                      .catch((e) =>
                        setMessage(
                          e instanceof Error
                            ? e.message
                            : "Fotoğraf seçilemedi.",
                        ),
                      )
                  }
                />
                {photo && (
                  <Button
                    secondary
                    label="Fotoğrafı kaldır"
                    onPress={() => setPhoto(null)}
                  />
                )}
                <Text style={styles.muted}>JPG / PNG · En fazla 2 MB</Text>
              </View>
            )}
            {mode === "signup" &&
              (["display_name", "username"] as const).map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field: { value, onChange } }) => (
                    <Field
                      label={name === "username" ? "Kullanıcı adı" : "Adınız"}
                      value={value}
                      onChangeText={onChange}
                      error={errors[name]?.message}
                      autoCapitalize={name === "username" ? "none" : "words"}
                      autoCorrect={name !== "username"}
                    />
                  )}
                />
              ))}
            {mode !== "reset" && (
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange } }) => (
                  <Field
                    label="E-posta"
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                )}
              />
            )}
            {mode !== "forgot" && (
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange } }) => (
                  <Field
                    label={
                      mode === "signup" ? "Şifre · en az 8 karakter" : "Şifre"
                    }
                    value={value}
                    onChangeText={onChange}
                    error={errors.password?.message}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={
                      mode === "signup" || mode === "reset"
                        ? "new-password"
                        : "current-password"
                    }
                  />
                )}
              />
            )}
            {mode === "signup" && (
              <View style={{ gap: 12 }}>
                {(["terms", "privacy"] as const).map((name) => (
                  <Controller
                    key={name}
                    control={control}
                    name={name}
                    render={({ field: { value, onChange } }) => (
                      <View>
                        <View style={[styles.row, { flexWrap: "nowrap" }]}>
                          <Switch
                            accessibilityLabel={
                              name === "terms"
                                ? "Kullanım koşullarını kabul ediyorum"
                                : "Gizlilik politikasını kabul ediyorum"
                            }
                            value={value}
                            onValueChange={onChange}
                          />
                          <Text style={[styles.muted, { flex: 1 }]}>
                            {name === "terms"
                              ? "Kullanım koşullarını kabul ediyorum."
                              : "Gizlilik politikasını kabul ediyorum."}
                          </Text>
                        </View>
                        {errors[name] && (
                          <Text style={{ color: colors.red }}>
                            {errors[name]?.message}
                          </Text>
                        )}
                      </View>
                    )}
                  />
                ))}
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push("/settings")}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={[styles.muted, { color: colors.blue }]}>
                    Koşullar ve gizlilik hakkında
                  </Text>
                </Pressable>
              </View>
            )}
            <Message text={message} />
            <Button
              label={
                busy
                  ? "Bir saniye…"
                  : mode === "signup"
                    ? "Hesabımı oluştur"
                    : mode === "login"
                      ? "Giriş yap"
                      : mode === "reset"
                        ? "Şifremi güncelle"
                        : "Yenileme bağlantısı gönder"
              }
              disabled={busy}
              onPress={() => void handleSubmit(submit)()}
            />
            {mode === "login" && (
              <Pressable
                accessibilityRole="link"
                onPress={() => changeMode("forgot")}
                style={{
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.muted}>Şifremi unuttum</Text>
              </Pressable>
            )}
            {mode === "forgot" && (
              <Button
                secondary
                label="Girişe dön"
                onPress={() => changeMode("login")}
              />
            )}
          </>
        )}
        {sent && (
          <View style={styles.card}>
            <Text style={{ fontSize: textSize(32) }}>✉</Text>
            <Message text={message} />
            <Button
              label="Giriş ekranına dön"
              onPress={() => changeMode("login")}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
