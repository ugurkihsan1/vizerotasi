import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { Text, View } from "react-native";
import { useVerification } from "../lib/evidence";
import { styles, colors } from "./ui";
export function VerificationLabel({
  postId,
  compact = false,
  color,
}: {
  postId: string;
  compact?: boolean;
  color?: string;
}) {
  useAppearance();

  const q = useVerification(postId);
  const verified = q.data?.status === "verified";
  if (compact)
    return (
      <Text
        style={{
          color: color ?? colors.green,
          fontSize: textSize(10),
          lineHeight: 16,
        }}
      >
        {verified ? "✓ Belgeyle doğrulanmış deneyim" : "Kullanıcı deneyimi"}
      </Text>
    );
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={[
          styles.pillText,
          {
            color: verified ? colors.green : themeColor("#71579D", "text"),
            fontSize: textSize(11),
          },
        ]}
      >
        {q.isPending
          ? "Belge doğrulama durumu kontrol ediliyor…"
          : q.isError
            ? "Belge doğrulama durumu yüklenemedi"
            : verified
              ? "✓ Belgeyle doğrulanmış deneyim"
              : "Kullanıcı deneyimi · Belgeyle doğrulanmadı"}
      </Text>
      <Text style={[styles.muted, { fontSize: textSize(11) }]}>
        Yayın onayı doğruluk veya resmî kural onayı değildir.
        {verified
          ? " Destekleyici belge yönetimce incelendi; uygulama başvuruya göre değişebilir."
          : " Güncel gereklilikleri resmî kaynaktan kontrol et."}
      </Text>
    </View>
  );
}
