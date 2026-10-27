import { useAppearance } from "../lib/appearance";
import { useEffect, useRef, type ComponentRef } from "react";
import { ScrollView, View } from "react-native";
import { Chip } from "./ui";
/** Keep the selected tab visible when a page opens directly into a later tab. */
export function ScrollTabs({
  labels,
  value,
  onChange,
}: {
  labels: string[];
  value: string;
  onChange: (label: string) => void;
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
      contentContainerStyle={{ gap: 8 }}
    >
      {labels.map((label) => (
        <View
          key={label}
          onLayout={(e) => {
            positions.current[label] = e.nativeEvent.layout.x;
            if (label === value) reveal(label);
          }}
        >
          <Chip
            label={label}
            active={value === label}
            onPress={() => onChange(label)}
          />
        </View>
      ))}
    </ScrollView>
  );
}
