import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { db } from "./supabase";
export interface ChatPhotoDraft {
  base64: string;
  mime: "image/jpeg" | "image/png";
  id: string;
  path?: string;
}
export async function pickChatPhoto(): Promise<ChatPhotoDraft | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw Error("Galeri izni gerekli.");
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.75,
    base64: true,
  });
  if (r.canceled) return null;
  const base64 = r.assets[0].base64;
  if (!base64) throw Error("Fotoğraf okunamadı.");
  const mime = base64.startsWith("/9j/")
    ? "image/jpeg"
    : base64.startsWith("iVBOR")
      ? "image/png"
      : null;
  if (!mime) throw Error("JPG veya PNG fotoğraf seç.");
  if (Math.floor((base64.length * 3) / 4) > 5242880)
    throw Error("En fazla 5 MB fotoğraf seç.");
  return { base64, mime, id: randomUUID() };
}
export async function sendChatPhoto(
  photo: ChatPhotoDraft,
  room: string,
  user: string,
) {
  const path =
    photo.path ??
    `${room}/${user}/${photo.id}.${photo.mime === "image/png" ? "png" : "jpg"}`;
  if (!photo.path) {
    const bytes = Uint8Array.from(atob(photo.base64), (c) => c.charCodeAt(0));
    const r = await db()
      .storage.from("chat-media")
      .upload(path, bytes.buffer, { contentType: photo.mime });
    if (r.error) throw r.error;
    photo.path = path;
  }
  const r = await db().rpc("chat_send_attachment", {
    target: room,
    client_id: photo.id,
    photo_path: path,
  });
  if (r.error) throw r.error;
}
export async function discardChatPhoto(photo: ChatPhotoDraft) {
  if (photo.path) {
    const r = await db().storage.from("chat-media").remove([photo.path]);
    if (r.error) throw r.error;
  }
}
