import { useState, type PropsWithChildren } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./ui";
export function CriticalNotice({
  title,
  source,
  count,
  topic,
  referenceLabel = "Başvuru merkezi belgesi",
  children,
  initiallyOpen = false,
}: {
  title: string;
  source: "reference" | "experience" | "editorial" | "community";
  count?: number;
  topic?: string;
  referenceLabel?: string;
  initiallyOpen?: boolean;
} & PropsWithChildren) {
  const [open, setOpen] = useState(initiallyOpen);
  const official = source === "reference";
  const accent = official ? "#71579D" : "#24766C";
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: accent,
        borderRadius: 10,
        backgroundColor: official
          ? open
            ? "#FCFAFF"
            : "#F0EBFA"
          : open
            ? "#F8FCFA"
            : "#E7F2ED",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: official ? "#E9E0F5" : "#D2E7DD",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 46,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="alert-circle-outline" color={accent} size={18} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: accent }}>
            {title}
          </Text>
          <Text style={{ fontSize: 10, color: accent }}>
            {source === "reference"
              ? referenceLabel
              : source === "community"
                ? `Topluluk notu${topic ? ` · ${topic}` : ""}`
                : source === "editorial"
                  ? "Editör notu"
                  : `${count ?? 1} başvuru deneyimi · Kullanıcı aktarımı`}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={accent}
        />
      </Pressable>
      {open && (
        <View style={{ padding: 13, paddingTop: 2, gap: 10 }}>
          {children}
          {!official && (
            <Text style={[styles.muted, { fontSize: 11 }]}>
              Kişisel deneyim · Resmî kural değil
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
