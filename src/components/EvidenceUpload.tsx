import { useAppearance, themeColor } from "../lib/appearance";
import { HelpButton } from "./HelpButton";
import { useState } from "react";
import { View, Text } from "react-native";
import {
  chooseEvidence,
  type EvidenceDraft,
  EVIDENCE_LIMIT,
} from "../lib/evidence";
import { Button, styles, Message } from "./ui";
export function EvidenceUpload({
  files,
  onChange,
  disabled = false,
  existing = 0,
  compact = false,
}: {
  files: EvidenceDraft[];
  onChange: (files: EvidenceDraft[]) => void;
  disabled?: boolean;
  existing?: number;
  compact?: boolean;
}) {
  useAppearance();

  const [error, setError] = useState("");
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeColor("#F7F4FC", "surface"),
          padding: 12,
          gap: 8,
        },
        compact && {
          borderWidth: 0,
          padding: 0,
          backgroundColor: "transparent",
        },
      ]}
    >
      {!compact && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.pillText, { flex: 1 }]}>
            Belge ekle · isteğe bağlı
          </Text>
          <HelpButton
            label="Belge doğrulaması hakkında bilgi"
            title="Belgeyle doğrulama"
          >
            <Text style={styles.text}>
              Belgelere yalnız sen ve yetkili yönetim erişebilir. Diğer üyeler
              belgelerini göremez.
            </Text>
            <Text style={styles.text}>
              En fazla 5 belge ekleyebilirsin. PDF, JPG veya PNG; her biri en
              fazla 8 MB.
            </Text>
            <Text style={styles.text}>
              Yüklemeden önce kimlik ve hesap bilgilerini gizle. İlgili seyahat
              tarihleri görünsün.
            </Text>
            <Text style={styles.text}>
              Yönetim inceler; doğrulanırsa paylaşımın etiket ve +10 puan
              kazanır. Bu, resmî kural onayı değildir. Belgesiz de
              paylaşabilirsin.
            </Text>
          </HelpButton>
        </View>
      )}
      {!compact && (
        <Text style={styles.muted}>
          Sadece sen ve yönetim görür · Kişisel bilgileri gizle.
        </Text>
      )}
      {files.length > 0 && (
        <Text style={styles.muted}>Seçildi · Gönderince yüklenecek.</Text>
      )}
      {files.map((f, i) => (
        <View key={`${f.uri}:${i}`} style={{ gap: 4 }}>
          <Text style={styles.text}>
            {f.name} · {Math.ceil((f.size ?? 0) / 1024)} KB
          </Text>
          <Button
            secondary
            disabled={disabled}
            label={`${f.name} dosyasını kaldır`}
            onPress={() => onChange(files.filter((_, index) => index !== i))}
          />
        </View>
      ))}
      <Message text={error} />
      <Button
        secondary
        label={compact ? "Belge ekle" : "Destekleyici belgeleri seç"}
        disabled={disabled || files.length + existing >= EVIDENCE_LIMIT}
        onPress={() => {
          setError("");
          void chooseEvidence(EVIDENCE_LIMIT - files.length - existing)
            .then((selected) => onChange([...files, ...selected]))
            .catch((e) =>
              setError(e instanceof Error ? e.message : "Belge seçilemedi."),
            );
        }}
      />
    </View>
  );
}
