import { KeyboardForm } from "../src/components/KeyboardForm";
import { useHeaderHeight } from "expo-router/react-navigation";
import { finishAuth } from "../src/lib/auth-navigation";
import { SocialSignIn } from "../src/components/SocialSignIn";
import { Avatar } from "../src/components/Avatar";
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
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  Platform,
  Pressable,
  Keyboard,
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
import { termsVersion } from "../src/content/legal";
import {
  allowsAccountEmail,
  makePrivacyPreferences,
  savePrivacyPreferences,
} from "../src/lib/privacy";
import {
  LegalTextModal,
  PrivacyPreferences,
} from "../src/components/PrivacyPreferences";
import type { LegalDocumentId } from "../src/content/legal";
import { authErrorMessage } from "../src/lib/auth-errors";
import {
  styles,
  Button,
  Field,
  Message,
  colors,
  Sheet,
} from "../src/components/ui";
type AuthValues = {
  email: string;
  password: string;
  display_name: string;
  username: string;
  transfer: boolean;
  terms: boolean;
  privacy: boolean;
};
type Mode = "login" | "signup" | "forgot" | "reset";
type Confirmation = "checking" | "verified" | "error" | null;
const signupFieldMessages = {
  display_name: "Adın en az 2 karakter olmalı.",
  username: "3–24 karakter kullan; yalnız küçük harf, rakam ve alt çizgi.",
  email: "Geçerli bir e-posta adresi yaz.",
  password: "En az 8 karakter kullan.",
  transfer: "Açık rıza tercihini belirtmelisin.",
  terms: "Kullanım koşullarını kabul etmelisin.",
  privacy: "Gizlilik metnini okuduğunu belirtmelisin.",
};

const signupLegalChoices = [
  { field: "transfer", label: "Açık Rıza Metni", document: "transfer" },
  { field: "terms", label: "Kullanım Koşulları", document: "terms" },
  { field: "privacy", label: "Gizlilik Politikası", document: "privacy" },
] as const;

export default function Auth() {
  useAppearance();
  const headerHeight = useHeaderHeight();

  const params = useLocalSearchParams<{
    mode?: string;
    recovery?: string;
    oauth?: string;
  }>();
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
    : parseAuthCallback(initialAuthUrl)
      ? initialAuthUrl
      : callbackUrl;
  const initialCallback = parseAuthCallback(callbackSource);
  const [confirmation, setConfirmation] = useState<Confirmation>(
    initialCallback ? "checking" : null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signupStep, setSignupStep] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const revealActions = useCallback(() => {
    if (mode !== "signup" || signupStep < 2) {
      scroll.current?.scrollToEnd({ animated: false });
      return true;
    }
    return false;
  }, [mode, signupStep]);
  const [sent, setSent] = useState(false);
  const [photo, setPhoto] = useState<AvatarDraft | null>(null);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentId | null>(
    null,
  );
  const [emailPreferences, setEmailPreferences] = useState(false);
  const cache = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    getValues,
    watch,
  } = useForm<AuthValues>({
    shouldUnregister: false,
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      username: "",
      transfer: false,
      terms: false,
      privacy: false,
    },
  });
  const legalChoicesComplete =
    watch("transfer") && watch("terms") && watch("privacy");
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
        if (params.oauth === "1" || !callback.type) {
          if (active) {
            setConfirmation(null);
            clearInitialAuthUrl();
            if (Platform.OS === "web")
              window.history.replaceState({}, "", webPath("/auth"));
            finishAuth();
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
  }, [callbackSource, params.oauth]);
  const changeMode = (next: Mode) => {
    Keyboard.dismiss();
    scroll.current?.scrollTo({ y: 0, animated: false });
    setMode(next);
    setSignupStep(0);
    setConfirmation(null);
    setMessage("");
    setSent(false);
    clearErrors();
  };
  const moveSignupStep = (next: number) => {
    Keyboard.dismiss();
    clearErrors();
    setMessage("");
    setSignupStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const advanceSignup = () => {
    clearErrors();
    setMessage("");
    const values = getValues();
    const schema =
      signupStep === 0
        ? signupSchema.pick({ email: true })
        : signupSchema.pick({ username: true, password: true });
    const parsed = schema.safeParse({
      ...values,
      email: values.email.trim(),
      username: values.username.trim().toLowerCase(),
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const name = issue.path[0] as keyof AuthValues;
        setError(name, { message: signupFieldMessages[name] });
      }
      return;
    }
    moveSignupStep(signupStep + 1);
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
      if (mode === "forgot" && !allowsAccountEmail()) {
        setMessage(
          "E-posta göndermek için Ayarlar → Gizlilik ve izinler bölümünden Google/Gmail tercihini açmalısın.",
        );
        return;
      }
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
            const label = signupFieldMessages[name];
            setError(name, { message: label });
          }
          const first = parsed.error.issues[0]?.path[0];
          setSignupStep(
            first === "email"
              ? 0
              : first === "username" || first === "password"
                ? 1
                : 2,
          );
          scroll.current?.scrollTo({ y: 0, animated: false });
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
        // One receipt for the three deliberately unchecked signup controls.
        // Never inherit or silently copy an earlier device preference as consent.
        const legalPreferences = makePrivacyPreferences({
          supabase: true,
          google: true,
          github: Platform.OS === "web",
        });
        const r = await db().auth.signUp({
          email: value.email,
          password: value.password,
          options: {
            data: {
              display_name: value.display_name,
              username: value.username,
              terms_accepted: true,
              privacy_accepted: true,
              transfer_accepted: true,
              legal_preferences: {
                ...legalPreferences,
                termsVersion,
                source: Platform.OS === "web" ? "web" : "native",
              },
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
        // Keep the local device preference in sync with the server-side
        // signup receipt; a storage failure must not undo a created account.
        try {
          await savePrivacyPreferences(legalPreferences);
        } catch {
          // The signed-up user's explicit choices remain in auth metadata.
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
          finishAuth();
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
        finishAuth();
      } else {
        const r = await db().auth.signInWithPassword({
          email: v.email.trim(),
          password: v.password,
        });
        if (r.error) throw r.error;
        finishAuth();
      }
    } catch (e) {
      const text = authErrorMessage(e);
      if (
        mode === "signup" &&
        (e as { code?: string })?.code === "username_taken"
      ) {
        setSignupStep(1);
        scroll.current?.scrollTo({ y: 0, animated: false });
        setError("username", { message: text });
      } else setMessage(text);
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
        <Brand cover />
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
    <KeyboardForm
      style={styles.page}
      keyboardOffset={headerHeight}
      onKeyboardShown={revealActions}
    >
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : Platform.OS === "web"
              ? "none"
              : "on-drag"
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: 460,
            width: "100%",
            alignSelf: "center",
            paddingTop: 32,
            paddingBottom: 32,
            flexGrow: 1,
            gap: 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingBottom: 8 }}>
          <Brand cover />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>
            {mode === "signup"
              ? [
                  "E-posta adresin",
                  "Kullanıcı adı ve şifre",
                  "Adın ve fotoğrafın",
                ][signupStep]
              : mode === "forgot"
                ? "Şifreni sıfırla"
                : mode === "reset"
                  ? "Yeni şifre"
                  : "Giriş yap"}
          </Text>
          <Text style={styles.muted}>
            {mode === "signup"
              ? [
                  "Doğrulama bağlantısını buraya göndereceğiz.",
                  "Bir kullanıcı adı ve güçlü bir şifre seç.",
                  "Adını yaz, dilersen bir fotoğraf ekle.",
                ][signupStep]
              : mode === "login"
                ? "Kaldığın yerden devam et."
                : "Hesabına güvenle geri dön."}
          </Text>
        </View>
        {mode === "signup" && !sent && (
          <View
            accessibilityLabel={`Üyelik adımı ${signupStep + 1} / 3`}
            style={{ flexDirection: "row", gap: 6 }}
          >
            {[0, 1, 2].map((step) => (
              <View
                key={step}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    step <= signupStep
                      ? colors.blue
                      : themeColor("#DFE8E4", "border"),
                }}
              />
            ))}
          </View>
        )}
        {["login", "signup"].includes(mode) &&
          !sent &&
          (mode !== "signup" || signupStep === 0) && (
            <View
              style={{
                flexDirection: "row",
                gap: 28,
                borderBottomWidth: 1,
                borderBottomColor: themeColor("#E8E8E8", "border"),
              }}
            >
              {(["login", "signup"] as const).map((x) => (
                <Pressable
                  key={x}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === x }}
                  aria-selected={mode === x}
                  onPress={() => changeMode(x)}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 2,
                    borderBottomWidth: 2,
                    borderBottomColor:
                      mode === x ? colors.text : "transparent",
                    marginBottom: -1,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: mode === x ? colors.text : colors.muted,
                      fontSize: 15,
                      fontWeight: mode === x ? "600" : "400",
                    }}
                  >
                    {x === "login" ? "Giriş yap" : "Üye ol"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        {!sent &&
          (mode === "login" || (mode === "signup" && signupStep === 0)) && (
            <SocialSignIn
              disabled={busy}
              onBusyChange={setBusy}
              onError={setMessage}
            />
          )}
        {!sent && (
          <>
            {mode === "signup" && signupStep === 2 && (
              <View
                style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    photo
                      ? "Profil fotoğrafını değiştir"
                      : "Profil fotoğrafı ekle (isteğe bağlı)"
                  }
                  onPress={() => {
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
                      );
                  }}
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 64,
                    borderWidth: 2,
                    borderColor: colors.blue,
                    padding: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {photo ? (
                    <Image
                      source={{ uri: avatarPreview(photo) }}
                      contentFit="cover"
                      style={{ width: 112, height: 112, borderRadius: 56 }}
                      accessibilityLabel="Seçilen profil fotoğrafı"
                    />
                  ) : (
                    <Avatar name="Profil fotoğrafı" size={112} />
                  )}
                  <View
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: 2,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.blue,
                      borderWidth: 3,
                      borderColor: colors.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={21}
                      color={themeColor("#FFFFFF", "surface")}
                    />
                  </View>
                </Pressable>
                <Text style={{ color: colors.blue, fontWeight: "600" }}>
                  {photo ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
                </Text>
                {photo && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPhoto(null)}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Text style={styles.muted}>Fotoğrafı kaldır</Text>
                  </Pressable>
                )}
              </View>
            )}
            {mode === "signup" &&
              (["display_name", "username"] as const)
                .filter((name) =>
                  name === "display_name" ? signupStep === 2 : signupStep === 1,
                )
                .map((name) => (
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
            {mode !== "reset" && (mode !== "signup" || signupStep === 0) && (
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
            {mode !== "forgot" && (mode !== "signup" || signupStep === 1) && (
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
            {mode === "signup" && signupStep === 2 && (
              <View style={{ gap: 10 }}>
                {signupLegalChoices.map(({ field, label, document }) => (
                  <Controller
                    key={field}
                    control={control}
                    name={field}
                    render={({ field: { value, onChange } }) => (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          minHeight: 48,
                          gap: 12,
                        }}
                      >
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityLabel={`${label} onayı`}
                          accessibilityState={{ checked: value }}
                          onPress={() => onChange(!value)}
                          style={{
                            width: 44,
                            minHeight: 44,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name={value ? "checkbox" : "square-outline"}
                            size={27}
                            color={colors.blue}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="link"
                          onPress={() => setLegalDocument(document)}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={[
                              styles.text,
                              {
                                color: colors.blue,
                                textDecorationLine: "underline",
                              },
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  />
                ))}
              </View>
            )}
            <LegalTextModal
              document={legalDocument}
              onClose={() => setLegalDocument(null)}
            />
            {mode === "forgot" && !allowsAccountEmail() && (
              <Button
                secondary
                label="E-posta tercihini yönet"
                onPress={() => setEmailPreferences(true)}
              />
            )}
            <Sheet
              visible={emailPreferences}
              onClose={() => setEmailPreferences(false)}
              title="E-posta tercihi"
            >
              <PrivacyPreferences
                management
                onSaved={() => setEmailPreferences(false)}
              />
            </Sheet>
            <Message text={message} />
            <Button
              label={
                busy
                  ? "Bir saniye…"
                  : mode === "signup"
                    ? signupStep < 2
                      ? "Devam et"
                      : "Hesabımı oluştur"
                    : mode === "login"
                      ? "Giriş yap"
                      : mode === "reset"
                        ? "Şifremi güncelle"
                        : "Yenileme bağlantısı gönder"
              }
              disabled={
                busy ||
                (mode === "signup" && signupStep === 2 && !legalChoicesComplete)
              }
              onPress={() =>
                mode === "signup" && signupStep < 2
                  ? advanceSignup()
                  : void handleSubmit(submit)()
              }
            />
            {mode === "signup" && signupStep > 0 && (
              <Button
                secondary
                label="Geri"
                disabled={busy}
                onPress={() => moveSignupStep(signupStep - 1)}
              />
            )}
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
    </KeyboardForm>
  );
}
