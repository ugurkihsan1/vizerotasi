import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { VerificationLabel } from "./VerificationLabel";
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CriticalNotice } from "./CriticalNotice";
import { useDocumentNotes, type DocumentNote } from "../lib/document-notes";
import { useToggle } from "../lib/data";
import { useAuth } from "../lib/auth";
import { styles, colors, useGate, Message } from "./ui";
export function SourceDocumentWarning({ order }: { order: number }) {
  useAppearance();

  const notes: Record<number, { title: string; body: string }> = {
    2: {
      title: "Fotoğraf ölçüsü ve tarihi önemli",
      body: "Kaynak 35 × 45 mm, son 6 ayda çekilmiş, gözlük gibi aksesuarlar olmadan hazırlanmış 2 fotoğraf ister. Ölçülere uymayan fotoğrafların kabul edilmeyeceğini belirtir.",
    },
    5: {
      title: "Sigortanın süresini ve teminatını kontrol et",
      body: "BLS İstanbul listesi: seyahatten 1 gün önce başlamalı, seyahatin tamamını kapsamalı ve en az 30.000 € teminatlı olmalı. 7 günden kısa seyahat için en az 7 günlük sigorta istenir.",
    },
    8: {
      title: "Tavsiye tutarını kesin alt sınırla karıştırma",
      body: "Kaynakta 1.500–2.000 € gösterilmesi tavsiye edilir; bu herkes için kesin bir asgari zorunluluk değildir. Ulaşım ve konaklamaya ek günlük 150 € hesabı ve son 6 aylık vadesiz hesap hareketleri ayrı koşullardır.",
    },
    12: {
      title: "18 yaş altı: muvafakat, tercüme ve apostil",
      body: "Bu koşullar başvuranın yaşı ve kimlerle seyahat ettiğine bağlıdır. Tek ebeveynle seyahat, vefat ve mahkeme kararı durumlarını; orijinal, ASLI GİBİDİR kopya ve tercüme koşullarını aşağıdaki listeden ayrı ayrı kontrol et.",
    },
  };
  const note = notes[order];
  return note ? (
    <CriticalNotice title={note.title} source="reference">
      <Text style={styles.text}>{note.body}</Text>
    </CriticalNotice>
  ) : null;
}
function ExperienceWarning({ note }: { note: DocumentNote }) {
  useAppearance();

  const toggle = useToggle("document_note_confirmations", "note_id", note.id);
  const { session } = useAuth();
  const gate = useGate();
  const [error, setError] = useState("");
  return (
    <CriticalNotice
      title={note.title}
      source={note.source_type}
      count={note.post_id ? 1 : undefined}
    >
      {note.post_id && note.source_type === "experience" && (
        <VerificationLabel postId={note.post_id} compact />
      )}
      <Text style={styles.text}>{note.body}</Text>
      {note.scope && <Text style={styles.muted}>Kapsam: {note.scope}</Text>}
      {note.similar_count > 0 && (
        <View style={styles.row}>
          <Ionicons
            name="people-outline"
            size={16}
            color={themeColor("#7661A6", "text")}
          />
          <Text
            style={{
              fontSize: textSize(12),
              color: themeColor("#71579D", "text"),
            }}
          >
            {note.similar_count} kişi benzer deneyim bildirdi
          </Text>
        </View>
      )}
      {note.post_id && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/experience/${note.post_id}`)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: textSize(12), color: colors.blue }}>
            Kaynak deneyimi gör →
          </Text>
        </Pressable>
      )}
      {note.source_type === "experience" &&
        session?.user.id !== note.created_by &&
        session?.user.id !== note.source_user_id && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: toggle.active }}
            aria-pressed={toggle.active}
            disabled={toggle.pending}
            onPress={() =>
              gate.require(() => {
                void toggle
                  .toggle()
                  .catch(() =>
                    setError("Benzer deneyim bildirimin kaydedilemedi."),
                  );
              })
            }
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text
              style={{
                fontSize: textSize(12),
                fontWeight: "600",
                color: themeColor("#71579D", "text"),
              }}
            >
              {toggle.active
                ? "✓ Benzer deneyim bildirdin"
                : "Ben de benzer bir deneyim yaşadım"}
            </Text>
          </Pressable>
        )}
      <Message text={error} />
      {gate.view}
    </CriticalNotice>
  );
}
export function DocumentWarnings({
  country,
  documentId,
  documentKey,
}: {
  country: string;
  documentId?: string;
  documentKey?: string;
}) {
  useAppearance();

  const q = useDocumentNotes(country);
  const notes = q.data?.filter(
    (n) =>
      (documentId && n.document_id === documentId) ||
      (documentKey && n.document_key === documentKey),
  );
  return notes?.length ? (
    <View style={{ gap: 9 }}>
      {notes.map((n) => (
        <ExperienceWarning key={n.id} note={n} />
      ))}
    </View>
  ) : null;
}
