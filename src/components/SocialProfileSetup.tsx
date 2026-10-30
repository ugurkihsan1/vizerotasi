import { useState } from "react";
import {
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
import { Brand } from "./Brand";
import { LegalTextModal } from "./PrivacyPreferences";
import { colors, styles, Field, Button, Message, Busy } from "./ui";

const choices = [
  { field: "transfer", label: "Açık Rıza Metni", document: "transfer" },
  { field: "terms", label: "Kullanım Koşulları", document: "terms" },
  { field: "privacy", label: "Gizlilik Politikası", document: "privacy" },
] as const;

/** Covers the mounted navigator so a new social account cannot skip setup by going back. */
export function SocialProfileSetup() {
  useAppearance();
  const { session, profile } = useAuth();
  const cache = useQueryClient();
  const social = (
    session?.user.app_metadata.providers ?? [
      session?.user.app_metadata.provider,
    ]
  ).some((provider) => provider === "apple" || provider === "google");
  if (!session || !social || (profile && !profile.needs_onboarding))
    return null;
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
            <Busy />
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
  const { session } = useAuth();
  const cache = useQueryClient();
  const [name, setName] = useState(
    session?.user.user_metadata.full_name || profile.display_name || "",
  );
  const [username, setUsername] = useState("");
  const [accepted, setAccepted] = useState({
    transfer: false,
    terms: false,
    privacy: false,
  });
  const [document, setDocument] = useState<LegalDocumentId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      cache.setQueryData(["profile", profile.id], response.data);
      void cache.invalidateQueries({
        queryKey: ["public-profile", profile.id],
      });
    } catch (error) {
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
        <Text style={styles.title}>Profilini tamamla</Text>
        <Field
          label="Adın"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={60}
        />
        <Field
          label="Kullanıcı adı"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={24}
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
                  name={accepted[choice.field] ? "checkbox" : "square-outline"}
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
        <Message text={error} />
        <Button
          label={busy ? "Kaydediliyor…" : "Devam et"}
          disabled={
            busy || !accepted.transfer || !accepted.terms || !accepted.privacy
          }
          onPress={() => void complete()}
        />
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
