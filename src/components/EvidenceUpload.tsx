import { useAppearance, themeColor } from "../lib/appearance";
import { useState } from "react";
import { View, Text } from "react-native";
import {
  chooseEvidence,
  type EvidenceDraft,
  EVIDENCE_LIMIT,
} from "../lib/evidence";
import { Button, styles, Message, Sheet } from "./ui";
export function EvidenceUpload({
  files,
  onChange,
  disabled = false,
  existing = 0,
}: {
  files: EvidenceDraft[];
  onChange: (files: EvidenceDraft[]) => void;
  disabled?: boolean;
  existing?: number;
}) {
  useAppearance();

  const [error, setError] = useState("");
  const [info, setInfo] = useState(false);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColor("#F7F4FC", "surface"), padding: 16 },
      ]}
    >
      <Text style={styles.pillText}>Belge ekle · isteğe bağlı</Text>
      <Text style={styles.muted}>
        Belgelere yalnız sen ve yetkili yönetim erişebilir.
      </Text>
      <Text style={styles.muted}>
        Kimlik ve hesap bilgilerini gizle. Tarihler görünsün.
      </Text>
      <Text style={styles.muted}>5 belge · PDF/JPG/PNG · 8 MB</Text>
      <Button
        secondary
        label="Doğrulama bilgisi"
        onPress={() => setInfo(true)}
      />
      <Sheet
        visible={info}
        title="Belgeyle doğrulama"
        onClose={() => setInfo(false)}
      >
        <Text style={styles.text}>
          Yönetim belgeni inceler. Doğrulanırsa deneyimin etiket ve +10 puan
          kazanır. Belge yüklemek resmî kural onayı değildir; belgesiz de
          paylaşabilirsin.
        </Text>
      </Sheet>
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
        label="Destekleyici belgeleri seç"
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
