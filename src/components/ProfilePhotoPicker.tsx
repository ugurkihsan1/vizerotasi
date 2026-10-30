import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppearance } from "../lib/appearance";
import { Avatar } from "./Avatar";
import { colors, styles } from "./ui";
import { avatarPreview, pickAvatar, type AvatarDraft } from "../lib/avatar";

export function ProfilePhotoPicker({
  photo,
  onChange,
  onError,
  disabled,
}: {
  photo: AvatarDraft | null;
  onChange: (photo: AvatarDraft | null) => void;
  onError: (error: string) => void;
  disabled: boolean;
}) {
  useAppearance();
  const pick = async () => {
    try {
      const result = await pickAvatar();
      if (result) onChange(result);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Fotoğraf seçilemedi.");
    }
  };
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          photo
            ? "Profil fotoğrafını değiştir"
            : "Profil fotoğrafı ekle (isteğe bağlı)"
        }
        disabled={disabled}
        onPress={() => void pick()}
        style={{
          width: 128,
          height: 128,
          borderRadius: 64,
          padding: 6,
          borderWidth: 2,
          borderColor: colors.blue,
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
          <Ionicons name="add" size={21} color={colors.bg} />
        </View>
      </Pressable>
      <Text style={[styles.muted, { color: colors.blue }]}>
        {photo ? "Fotoğrafı değiştir" : "Fotoğraf ekle · isteğe bağlı"}
      </Text>
      {photo && (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onChange(null)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={styles.muted}>Fotoğrafı kaldır</Text>
        </Pressable>
      )}
    </View>
  );
}
