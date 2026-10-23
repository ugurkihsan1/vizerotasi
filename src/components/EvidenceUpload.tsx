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
}: {
  files: EvidenceDraft[];
  onChange: (files: EvidenceDraft[]) => void;
  disabled?: boolean;
  existing?: number;
}) {
  const [error, setError] = useState("");
  return (
    <View style={[styles.card, { backgroundColor: "#F7F4FC", padding: 16 }]}>
      <Text style={styles.heading}>Belgeyle destekle · isteğe bağlı</Text>
      <Text style={styles.text}>
        Paylaşımın belgesiz de incelenip yayımlanabilir. Seyahat tarihleri ve
        ilgili alanları görünen sigorta poliçesi, bilet veya benzer bir belge
        eklersen yönetim doğrulama için ayrıca inceler.
      </Text>
      <Text style={styles.muted}>
        Yönetim doğrularsa “Belgeyle doğrulanmış deneyim” etiketi ve +10 ek puan
        kazanırsın. Belge yüklemek otomatik doğrulama veya resmî kural onayı
        değildir.
      </Text>
      <Text style={styles.pillText}>
        Belgeler toplulukta görünmez; yalnız sen ve yetkili yönetim erişebilir.
      </Text>
      <Text style={styles.muted}>
        Kimlik/pasaport numarası, adres, poliçe numarası, bilet kodu ve
        barkodları yüklemeden önce gizle. İncelenecek tarih ve ilgili belge
        alanları görünsün. En fazla 5 belge · PDF/JPG/PNG · her biri 8 MB.
      </Text>
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
