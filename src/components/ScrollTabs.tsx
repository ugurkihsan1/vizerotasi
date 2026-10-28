import { useAppearance, textSize } from "../lib/appearance";
import { useEffect, useRef, type ComponentRef } from "react";
import { ScrollView, View, Pressable, Text } from "react-native";
import { Chip, colors } from "./ui";
/** Keep the selected tab visible when a page opens directly into a later tab. */
export function ScrollTabs({
  labels,
  value,
  onChange,
  plain = false,
}: {
  labels: string[];
  value: string;
  onChange: (label: string) => void;
  plain?: boolean;
}) {
  useAppearance();

  const scroll = useRef<ComponentRef<typeof ScrollView>>(null),
    positions = useRef<Record<string, number>>({});
  function reveal(label: string) {
    const x = positions.current[label];
    if (x !== undefined)
      scroll.current?.scrollTo({ x: Math.max(0, x - 12), animated: false });
  }
  useEffect(() => {
    const x = positions.current[value];
    if (x !== undefined)
      scroll.current?.scrollTo({ x: Math.max(0, x - 12), animated: false });
  }, [value]);
  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => reveal(value)}
      contentContainerStyle={{ gap: plain ? 18 : 8 }}
    >
      {labels.map((label) => (
        <View
          key={label}
          onLayout={(e) => {
            positions.current[label] = e.nativeEvent.layout.x;
            if (label === value) reveal(label);
          }}
        >
          {plain ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: value === label }}
              aria-pressed={value === label}
              onPress={() => onChange(label)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                borderBottomWidth: value === label ? 2 : 0,
                borderBottomColor: colors.navy,
              }}
            >
              <Text
                style={{
                  fontSize: textSize(14),
                  fontWeight: value === label ? "700" : "500",
                  color: value === label ? colors.navy : colors.muted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ) : (
            <Chip
              label={label}
              active={value === label}
              onPress={() => onChange(label)}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
