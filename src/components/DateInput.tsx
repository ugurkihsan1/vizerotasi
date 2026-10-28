import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { useRef, useState, type ElementRef } from "react";
import { Text, TextInput, View, Platform } from "react-native";
import { styles, colors } from "./ui";
export function DateInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  useAppearance();
  const [focused, setFocused] = useState(false);

  const month = useRef<ElementRef<typeof TextInput>>(null),
    year = useRef<ElementRef<typeof TextInput>>(null),
    day = useRef<ElementRef<typeof TextInput>>(null);
  const [yyyy = "", mm = "", dd = ""] = value.split("-");
  const parts = [dd, mm, yyyy].map((x) => x.replace(/_/g, ""));
  function change(index: number, input: string) {
    const digits = input.replace(/\D/g, "");
    if (index === 0 && digits.length === 8) {
      onChange(
        `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`,
      );
      year.current?.focus();
      return;
    }
    const next = [...parts];
    next[index] = digits.slice(0, index === 2 ? 4 : 2);
    onChange(
      next.every((x) => !x)
        ? ""
        : `${next[2].padEnd(4, "_")}-${next[1].padEnd(2, "_")}-${next[0].padEnd(2, "_")}`,
    );
    if (next[index].length === 2 && index < 2)
      (index === 0 ? month : year).current?.focus();
  }
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.muted}>{label}</Text>
      <View
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            padding: 0,
            paddingHorizontal: 8,
            minHeight: 44,
            borderRadius: 12,
            borderColor: focused
              ? colors.blue
              : themeColor("#DDE5F0", "border"),
            gap: 2,
          },
        ]}
      >
        {["Gün", "Ay", "Yıl"].map((name, index) => (
          <View
            key={name}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
            }}
          >
            {index > 0 && <Text style={styles.muted}>/</Text>}
            <TextInput
              ref={index === 0 ? day : index === 1 ? month : year}
              accessibilityLabel={`${label} · ${name.toLocaleLowerCase("tr-TR")}`}
              value={parts[index]}
              onChangeText={(x) => change(index, x)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder={["GG", "AA", "YYYY"][index]}
              placeholderTextColor={themeColor("#8190A5", "text")}
              maxLength={index === 0 ? 10 : index === 1 ? 2 : 4}
              selectTextOnFocus={Platform.OS !== "web"}
              style={{
                width: index === 2 ? 65 : 43,
                minHeight: 44,
                paddingVertical: 8,
                paddingHorizontal: 2,
                textAlign: "center",
                fontSize: textSize(15),
                color: colors.text,
                ...(Platform.OS === "web"
                  ? { outline: "none", outlineWidth: 0 }
                  : {}),
              }}
              onKeyPress={(e) => {
                if (
                  e.nativeEvent.key === "Backspace" &&
                  !parts[index] &&
                  index > 0
                )
                  (index === 1 ? day : month).current?.focus();
              }}
            />
          </View>
        ))}
      </View>
      {error && <Text style={{ color: colors.red }}>{error}</Text>}
    </View>
  );
}
