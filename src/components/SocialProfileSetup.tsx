import { useState, useRef } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { signupSchema } from "../lib/schemas";
import { authErrorMessage } from "../lib/auth-errors";
import { makePrivacyPreferences, savePrivacyPreferences } from "../lib/privacy";
import { termsVersion, type LegalDocumentId } from "../content/legal";
import { useAppearance } from "../lib/appearance";
import type { Profile } from "../lib/types";
import { uploadAvatar, type AvatarDraft } from "../lib/avatar";
import { ProfilePhotoPicker } from "./ProfilePhotoPicker";
import { Brand } from "./Brand";
import { LegalTextModal } from "./PrivacyPreferences";
import { colors, styles, Field, Button, Message } from "./ui";

const choices = [
  { field: "transfer", label: "Açık Rıza Metni", document: "transfer" },
  { field: "terms", label: "Kullanım Koşulları", document: "terms" },
  { field: "privacy", label: "Gizlilik Politikası", document: "privacy" },
] as const;

/** Covers the mounted navigator so a new social account cannot skip setup by going back. */
export function SocialProfileSetup() {
  useAppearance();
  const { session, profile, profileError } = useAuth();
  const cache = useQueryClient();
  const social = (
    session?.user.app_metadata.providers ?? [
      session?.user.app_metadata.provider,
    ]
  ).some((provider) => provider === "apple" || provider === "google");
  if (!session || !social || (profile && !profile.needs_onboarding))
    return null;
  // The launch overlay owns normal loading; do not present an error modal for it.
  if (!profile && !profileError) return null;
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {profile ? (
          <SetupForm key={profile.id} profile={profile} />
        ) : (
          <View style={[styles.content, { flex: 1, justifyContent: "center" }]}>
            <Brand cover />
            <Text style={[styles.muted, { textAlign: "center" }]}>
              Profilin yüklenemedi. Bağlantını kontrol edip yeniden
              deneyebilirsin.
            </Text>
            <Button
              secondary
              label="Yeniden dene"
              onPress={() =>
                void cache.invalidateQueries({
                  queryKey: ["profile", session.user.id],
                })
              }
            />
            <Button
              secondary
              label="Girişe dön"
              onPress={() => void db().auth.signOut()}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function SetupForm({ profile }: { profile: Profile }) {
  useAppearance();
  const { session } = useAuth();
  const cache = useQueryClient();
  const [name, setName] = useState(
    session?.user.user_metadata.full_name ||
      (profile.display_name === "Yeni Üye" ? "" : profile.display_name) ||
      "",
  );
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<0 | 1>(0);
  const [photo, setPhoto] = useState<AvatarDraft | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [accepted, setAccepted] = useState({
    transfer: false,
    terms: false,
    privacy: false,
  });
  const [document, setDocument] = useState<LegalDocumentId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const move = (next: 0 | 1) => {
    Keyboard.dismiss();
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const advance = async () => {
    setError("");
    const parsed = signupSchema
      .pick({ username: true })
      .safeParse({ username: username.trim().toLowerCase() });
    if (!parsed.success) {
      setError(
        "Kullanıcı adın 3–24 karakter olmalı; küçük harf, rakam ve alt çizgi kullan.",
      );
      return;
    }
    setBusy(true);
    try {
      const check = await db()
        .from("profiles")
        .select("id")
        .eq("username", parsed.data.username)
        .neq("id", profile.id)
        .limit(1);
      if (check.error) throw { code: "username_check_failed" };
      if (check.data?.length) throw { code: "username_taken" };
      setUsername(parsed.data.username);
      move(1);
    } catch (error) {
      setError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const complete = async () => {
    setError("");
    const result = signupSchema
      .pick({ username: true, display_name: true })
      .safeParse({
        username: username.trim().toLowerCase(),
        display_name: name.trim(),
      });
    if (!result.success) {
      setError(
        result.error.issues[0]?.path[0] === "username"
          ? "Kullanıcı adın 3–24 karakter olmalı; küçük harf, rakam ve alt çizgi kullan."
          : "Adın 2–60 karakter olmalı.",
      );
      return;
    }
    if (!accepted.transfer || !accepted.terms || !accepted.privacy) return;
    setBusy(true);
    try {
      const preferences = makePrivacyPreferences({
        supabase: true,
        google: true,
        github: Platform.OS === "web",
      });
      const response = await db()
        .rpc("complete_social_signup", {
          chosen_username: result.data.username,
          chosen_name: result.data.display_name,
          accepted_terms: accepted.terms,
          accepted_privacy: accepted.privacy,
          accepted_transfer: accepted.transfer,
          preference_payload: {
            ...preferences,
            termsVersion,
            source: Platform.OS === "web" ? "web" : "native",
          },
        })
        .single();
      if (response.error) throw response.error;
      // Local storage problems do not invalidate the server-side completion.
      try {
        await savePrivacyPreferences(preferences);
      } catch {
        /* Server receipt is saved. */
      }
      const completedProfile = { ...(response.data as Profile) };
      if (photo) {
        try {
          completedProfile.avatar_url = await uploadAvatar(photo, profile.id);
        } catch {
          Alert.alert(
            "Fotoğraf eklenemedi",
            "Hesabın hazır. Fotoğrafını Ayarlar’dan ekleyebilirsin.",
          );
        }
      }
      cache.setQueryData(["profile", profile.id], completedProfile);
      void cache.invalidateQueries({
        queryKey: ["public-profile", profile.id],
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (
        code === "username_taken" ||
        (code === "23505" &&
          (error as { message?: string }).message?.includes(
            "profiles_username_key",
          ))
      )
        move(0);
      setError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          gap: 18,
          width: "100%",
          maxWidth: 460,
          alignSelf: "center",
        }}
      >
        <Brand />
        <Text style={styles.title}>
          {step === 0 ? "Kullanıcı adını seç" : "Adın ve fotoğrafın"}
        </Text>
        <View
          accessibilityLabel={`Profil adımı ${step + 1} / 2`}
          style={{ flexDirection: "row", gap: 6 }}
        >
          {[0, 1].map((index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: index <= step ? colors.blue : colors.muted,
              }}
            />
          ))}
        </View>
        {step === 0 ? (
          <Field
            label="Kullanıcı adı"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            editable={!busy}
          />
        ) : (
          <>
            <ProfilePhotoPicker
              photo={photo}
              onChange={setPhoto}
              onError={setError}
              disabled={busy}
            />
            <Field
              label="Adın"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              maxLength={60}
              editable={!busy}
            />
            <View style={{ gap: 4 }}>
              {choices.map((choice) => (
                <View
                  key={choice.field}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${choice.label} onayı`}
                    accessibilityState={{ checked: accepted[choice.field] }}
                    disabled={busy}
                    onPress={() =>
                      setAccepted((value) => ({
                        ...value,
                        [choice.field]: !value[choice.field],
                      }))
                    }
                    style={{
                      width: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={
                        accepted[choice.field] ? "checkbox" : "square-outline"
                      }
                      size={26}
                      color={colors.blue}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => setDocument(choice.document)}
                    style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
                  >
                    <Text
                      style={[styles.text, { textDecorationLine: "underline" }]}
                    >
                      {choice.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
        <Message text={error} />
        <Button
          label={
            busy ? "Bir saniye…" : step === 0 ? "Devam et" : "Hesabımı tamamla"
          }
          disabled={
            busy ||
            (step === 1 &&
              (!accepted.transfer || !accepted.terms || !accepted.privacy))
          }
          onPress={() => void (step === 0 ? advance() : complete())}
        />
        {step === 1 && (
          <Button
            secondary
            label="Geri"
            disabled={busy}
            onPress={() => {
              setError("");
              move(0);
            }}
          />
        )}
        <Button
          secondary
          label="Vazgeç ve çıkış yap"
          disabled={busy}
          onPress={() => void db().auth.signOut()}
        />
        <LegalTextModal document={document} onClose={() => setDocument(null)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
