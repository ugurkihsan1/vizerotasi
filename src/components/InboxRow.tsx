import { Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Avatar } from "./PostCard";
import { CountryFlag } from "./CountryFlag";
import { colors } from "./ui";
import { themeColor, textSize, useAppearance } from "../lib/appearance";
import { formatDate } from "../lib/dates";
import type { InboxRoom } from "../lib/chat";
import type { Country } from "../lib/types";
export interface InboxPerson {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}
function inboxTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const now = Date.now(),
    day = formatDate(value);
  if (day === formatDate(new Date(now).toISOString()))
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    }).format(date);
  if (day === formatDate(new Date(now - 86400000).toISOString())) return "Dün";
  return day;
}
export function InboxRow({
  room,
  people = [],
  country,
}: {
  room: InboxRoom;
  people?: InboxPerson[];
  country?: Country;
}) {
  useAppearance();
  const unread =
    room.status === "active" && !room.closed_at && room.unread_count > 0;
  const name =
    room.kind === "direct"
      ? (people[0]?.display_name ?? room.title.split(" · @")[0])
      : room.title;
  const preview =
    room.status === "invited"
      ? "Yeni sohbet isteği"
      : room.closed_at
        ? "Sohbet kapatıldı"
        : room.last_body === null
          ? "Henüz mesaj yok"
          : room.last_body === ""
            ? "Mesaj kaldırıldı"
            : room.last_body;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${room.title}${room.status === "invited" ? " · Sohbet isteği" : ""}`}
      onPress={() => router.push(`/chat/${room.id}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 16,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {room.kind === "direct" ? (
          <Avatar name={name} url={people[0]?.avatar_url} size={56} />
        ) : room.kind === "group" && people.length > 1 ? (
          <>
            <View style={{ position: "absolute", top: 0, left: 0 }}>
              <Avatar
                name={people[0].display_name}
                url={people[0].avatar_url}
                size={37}
              />
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                padding: 2,
                borderRadius: 24,
                backgroundColor: colors.bg,
              }}
            >
              <Avatar
                name={people[1].display_name}
                url={people[1].avatar_url}
                size={37}
              />
            </View>
          </>
        ) : (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: themeColor("#F0F0F0", "surface"),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {room.kind === "community" && country ? (
              <CountryFlag
                code={country.code}
                emoji={country.flag}
                name={country.name}
              />
            ) : (
              <Ionicons
                name={
                  room.kind === "group" ? "people-outline" : "globe-outline"
                }
                size={25}
                color={colors.navy}
              />
            )}
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.navy,
              fontSize: textSize(15),
              fontWeight: unread ? "800" : "600",
            }}
          >
            {name}
          </Text>
          {room.status === "invited" && (
            <Text
              style={{
                color: colors.muted,
                fontSize: textSize(10),
                borderWidth: 1,
                borderColor: themeColor("#E4E4E4", "border"),
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              İstek
            </Text>
          )}
          <Text
            style={{
              color: unread ? colors.navy : colors.muted,
              fontSize: textSize(11),
              fontWeight: unread ? "600" : "400",
            }}
          >
            {inboxTime(room.last_at)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: unread ? colors.text : colors.muted,
              fontSize: textSize(13),
              lineHeight: textSize(19),
              fontWeight: unread ? "600" : "400",
            }}
          >
            {preview}
          </Text>
          {!!unread && (
            <View
              accessibilityLabel={`${room.unread_count} okunmamış mesaj`}
              style={{
                minWidth: 19,
                height: 19,
                borderRadius: 10,
                paddingHorizontal: 5,
                backgroundColor: colors.navy,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: colors.bg,
                  fontWeight: "700",
                  fontSize: textSize(10),
                }}
              >
                {room.unread_count > 99 ? "99+" : room.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
