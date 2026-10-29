import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { legalDocument, type LegalDocumentId } from "../content/legal";
import { useAppearance } from "../lib/appearance";
import {
  getPrivacyState,
  makePrivacyPreferences,
  savePrivacyPreferences,
  blockPrivacyLocally,
  privacyStorageError,
} from "../lib/privacy";
import {
  clearPrivateDeviceData,
  sendWithdrawalReceipt,
  stopSupabase,
} from "../lib/supabase";
import {
  acknowledgeWithdrawal,
  queueWithdrawal,
} from "../lib/privacy-receipts";
import { Button, colors, Message, Sheet, styles } from "./ui";

/** Bundled text is available before any remote SDK or account is initialized. */
export function LegalTextModal({
  document,
  onClose,
}: {
  document: LegalDocumentId | null;
  onClose: () => void;
}) {
  useAppearance();
  const value = legalDocument(document ?? undefined);
  return (
    <Modal visible={!!value} animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: Platform.OS === "ios" ? 54 : 20,
        }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Button secondary label="Metni kapat" onPress={onClose} />
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 18 }}
        >
          <Text style={styles.title}>{value?.title}</Text>
          <Text style={styles.muted}>Son güncelleme: {value?.updatedAt}</Text>
          {value?.sections.map((section) => (
            <View key={section.heading} style={{ gap: 10 }}>
              <Text style={styles.heading}>{section.heading}</Text>
              {section.blocks.map((block, index) =>
                block.kind === "paragraph" ? (
                  <Text selectable key={index} style={styles.text}>
                    {block.text.replace(/\*\*/g, "")}
                  </Text>
                ) : (
                  <View key={index} style={{ gap: 8 }}>
                    {block.items.map((item, n) => (
                      <Text selectable key={n} style={styles.text}>
                        • {item.replace(/\*\*/g, "")}
                      </Text>
                    ))}
                  </View>
                ),
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function PrivacyPreferences({
  management = false,
  accessToken,
  userId,
  onSaved,
  onStop,
}: {
  management?: boolean;
  accessToken?: string;
  userId?: string;
  onSaved?: () => void;
  onStop?: () => void;
}) {
  useAppearance();
  const current = getPrivacyState().preferences;
  const [supabase, setSupabase] = useState(current?.supabase ?? false);
  const [google, setGoogle] = useState(current?.google ?? false);
  const [github, setGithub] = useState(current?.github ?? false);
  const [read, setRead] = useState(!!current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [document, setDocument] = useState<LegalDocumentId | null>(null);
  const [confirm, setConfirm] = useState(false);
  async function save(withdraw = false) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const next = makePrivacyPreferences(
      withdraw
        ? { supabase: false, google: false, github: false }
        : { supabase, google, github },
    );
    const stopping =
      !!current?.supabase &&
      (!next.supabase || (Platform.OS === "web" && !next.github));
    try {
      if (stopping) {
        stopSupabase();
        onStop?.();
        blockPrivacyLocally(next);
      }
      if (stopping && userId) await queueWithdrawal(userId, next);
      await savePrivacyPreferences(next);
      if (stopping) {
        await clearPrivateDeviceData();
        if (accessToken && userId) {
          // This request communicates only the explicitly requested withdrawal.
          // The SDK, background queries and refresh transport remain blocked.
          void sendWithdrawalReceipt(accessToken, {
            ...next,
            source: Platform.OS === "web" ? "web" : "native",
          })
            .then(() => acknowledgeWithdrawal(userId, next.acknowledgedAt))
            .catch(() => {
              /* Retained until an explicit, authenticated retry. */
            });
        }
      }
      if (withdraw) {
        setSupabase(false);
        setGoogle(false);
        setGithub(false);
      }
      setMessage("Tercihlerin bu cihazda kaydedildi.");
      onSaved?.();
    } catch {
      if (stopping) {
        await clearPrivateDeviceData().catch(() => {});
        privacyStorageError(
          "Bağlantılar durduruldu; tercih kaydı tamamlanamadı. Yeniden kaydet veya destek adresine başvur.",
        );
      }
      setMessage("Tercihler kaydedilemedi. Yeniden dene.");
    } finally {
      setBusy(false);
    }
  }
  const toggle = (
    label: string,
    detail: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
  ) => (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.text, { fontWeight: "600" }]}>{label}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={busy}
      />
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.title}>Gizlilik tercihlerin</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => setDocument("privacy")}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={[styles.text, { textDecorationLine: "underline" }]}>
          Gizlilik ve aydınlatma metni
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => setDocument("transfer")}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={[styles.text, { textDecorationLine: "underline" }]}>
          Yurt dışına aktarım ve riskler
        </Text>
      </Pressable>
      {toggle(
        "Gizlilik metnini okudum",
        "Aydınlatma kaydıdır; açık rızadan ayrıdır.",
        read,
        setRead,
      )}
      {toggle(
        "Supabase aktarımı",
        "Hesap, paylaşımlar ve mesajlar · Seul merkezli yurt dışı altyapı.",
        supabase,
        setSupabase,
      )}
      {toggle(
        "Google/Gmail aktarımı",
        "Doğrulama, şifre sıfırlama ve destek e-postaları.",
        google,
        setGoogle,
      )}
      {Platform.OS === "web" &&
        toggle(
          "GitHub Pages aktarımı",
          "Web sürümünün IP ve teknik bağlantı bilgileri.",
          github,
          setGithub,
        )}
      <Text style={styles.muted}>
        Mevcut üyelik ve akış Supabase altyapısına bağlıdır.{" "}
        {Platform.OS === "web"
          ? "GitHub Pages ilk sayfa isteğini zaten alır; bu ekran önceki aktarımı geri almaz. "
          : ""}
        Tercihler, yurt dışı aktarımının hukuki şartlarının tamamlandığı
        anlamına gelmez.
      </Text>
      <Message text={message || getPrivacyState().error} />
      <Button
        label={busy ? "Kaydediliyor…" : "Tercihlerimi kaydet"}
        disabled={
          busy ||
          !read ||
          (!management && (!supabase || (Platform.OS === "web" && !github)))
        }
        onPress={() => void save()}
      />
      {management ? (
        <Button
          secondary
          label="Aktarım tercihlerini geri çek"
          disabled={busy}
          onPress={() => setConfirm(true)}
        />
      ) : (
        <Button
          secondary
          label="İzin vermiyorum"
          disabled={busy}
          onPress={() => void save(true)}
        />
      )}
      <LegalTextModal document={document} onClose={() => setDocument(null)} />
      <Sheet
        visible={confirm}
        onClose={() => !busy && setConfirm(false)}
        title="Aktarım tercihleri"
      >
        <Text style={styles.text}>
          Bu cihazdaki bağlantılar ve oturum kapatılır. Hesabın kendiliğinden
          silinmez. Sunucudaki verilerinle ilgili taleplerini
          vizeselapp@gmail.com adresine iletebilirsin.
        </Text>
        <Button
          label="Geri çek"
          disabled={busy}
          onPress={() => {
            setConfirm(false);
            void save(true);
          }}
        />
      </Sheet>
    </View>
  );
}
