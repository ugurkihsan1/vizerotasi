import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles, colors } from "./ui";
export function ChecklistSummary({
  complete,
  total,
  onOptions,
  filterLabel,
}: {
  complete: number;
  total: number;
  onOptions: () => void;
  filterLabel?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#EDF3ED",
        borderRadius: 18,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.pillText}>
            {complete} / {total} belge işaretlendi
          </Text>
          {filterLabel && (
            <Text style={[styles.muted, { fontSize: 12 }]}>{filterLabel}</Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Liste seçenekleri ve kaynaklar"
          onPress={onOptions}
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            backgroundColor: "#FFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="options-outline" size={21} color={colors.blue} />
        </Pressable>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Belge hazırlık ilerlemesi"
        accessibilityValue={{ min: 0, max: total, now: complete }}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={complete}
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: "#D7E3DB",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.green,
            width: `${total ? (complete / total) * 100 : 0}%`,
          }}
        />
      </View>
    </View>
  );
}
