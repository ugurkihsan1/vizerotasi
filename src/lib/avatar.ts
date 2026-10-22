import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./supabase";
export interface AvatarDraft {
  base64: string;
  mimeType: "image/jpeg" | "image/png";
}
const pendingKey = (id: string) => `pending-signup-avatar:v1:${id}`;
const inFlight = new Map<string, Promise<boolean>>();
export async function pickAvatar(): Promise<AvatarDraft | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error("Fotoğraf seçmek için galeri izni gerekli.");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return null;
  const base64 = result.assets[0].base64;
  if (!base64) throw new Error("Fotoğraf okunamadı. Başka bir fotoğraf seç.");
  const mimeType = base64.startsWith("/9j/")
    ? "image/jpeg"
    : base64.startsWith("iVBOR")
      ? "image/png"
      : null;
  if (!mimeType) throw new Error("JPG veya PNG biçiminde bir fotoğraf seç.");
  if (base64.length > Math.ceil(2097152 / 3) * 4)
    throw new Error("En fazla 2 MB fotoğraf seç.");
  return { base64, mimeType };
}
export const avatarPreview = (photo: AvatarDraft) =>
  `data:${photo.mimeType};base64,${photo.base64}`;
export async function uploadAvatar(photo: AvatarDraft, userId: string) {
  const bytes = Uint8Array.from(atob(photo.base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > 2097152)
    throw new Error("En fazla 2 MB fotoğraf seç.");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${photo.mimeType === "image/png" ? "png" : "jpg"}`;
  const r = await db()
    .storage.from("avatars")
    .upload(path, bytes.buffer, { contentType: photo.mimeType });
  if (r.error) throw r.error;
  const url = db().storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const result = await db()
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);
  if (result.error) throw result.error;
  return url;
}
export async function savePendingAvatar(userId: string, photo: AvatarDraft) {
  await AsyncStorage.setItem(pendingKey(userId), JSON.stringify(photo));
}
export async function finishPendingAvatar(userId: string): Promise<boolean> {
  const existing = inFlight.get(userId);
  if (existing) {
    await existing;
    return finishPendingAvatar(userId);
  }
  const operation = (async () => {
    const stored = await AsyncStorage.getItem(pendingKey(userId));
    if (!stored) return false;
    const photo = JSON.parse(stored) as AvatarDraft;
    if (
      typeof photo.base64 !== "string" ||
      !["image/jpeg", "image/png"].includes(photo.mimeType)
    )
      throw new Error("Invalid avatar draft");
    await uploadAvatar(photo, userId);
    await AsyncStorage.removeItem(pendingKey(userId));
    return true;
  })();
  inFlight.set(userId, operation);
  try {
    return await operation;
  } finally {
    inFlight.delete(userId);
  }
}
