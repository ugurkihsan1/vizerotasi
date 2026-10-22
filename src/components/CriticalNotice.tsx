import { useState, type PropsWithChildren } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./ui";
export function CriticalNotice({
  title,
  source,
  count,
  topic,
  children,
  initiallyOpen = false,
}: {
  title: string;
  source: "reference" | "experience" | "editorial" | "community";
  count?: number;
  topic?: string;
  initiallyOpen?: boolean;
} & PropsWithChildren) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: "#7661A6",
        borderRadius: 10,
        backgroundColor: open ? "#FCFAFF" : "#F0EBFA",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E9E0F5",
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
        <Ionicons name="alert-circle-outline" color="#71579D" size={18} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#644A94" }}>
            {title}
          </Text>
          <Text style={{ fontSize: 10, color: "#806A9D" }}>
            {source === "reference"
              ? "Başvuru merkezi belgesi"
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
          color="#71579D"
        />
      </Pressable>
      {open && (
        <View style={{ padding: 13, paddingTop: 2, gap: 10 }}>
          {children}
          <Text
            style={[
              styles.muted,
              {
                fontSize: 11,
                lineHeight: 18,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: "#ECE4F6",
              },
            ]}
          >
            {source === "reference"
              ? "Bu bilgi kaynak belgenin kapsamıyla sınırlıdır. Başvurmadan önce güncel resmî koşulları kontrol et."
              : "Kişisel deneyim veya editör açıklamasıdır; belge muafiyeti ya da herkese uygulanan bir kural değildir. Güncel koşulları resmî kaynaktan kontrol et."}
          </Text>
        </View>
      )}
    </View>
  );
}
