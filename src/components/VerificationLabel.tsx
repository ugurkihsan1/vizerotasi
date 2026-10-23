import { Text, View } from "react-native";
import { useVerification } from "../lib/evidence";
import { styles } from "./ui";
export function VerificationLabel({ postId }: { postId: string }) {
  const q = useVerification(postId);
  const verified = q.data?.status === "verified";
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={[
          styles.pillText,
          { color: verified ? "#24766C" : "#71579D", fontSize: 11 },
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
      <Text style={[styles.muted, { fontSize: 11 }]}>
        Yayın onayı doğruluk veya resmî kural onayı değildir.
        {verified
          ? " Destekleyici belge yönetimce incelendi; uygulama başvuruya göre değişebilir."
          : " Güncel gereklilikleri resmî kaynaktan kontrol et."}
      </Text>
    </View>
  );
}
