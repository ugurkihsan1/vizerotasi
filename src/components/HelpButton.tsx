import { useState, type PropsWithChildren } from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppearance } from "../lib/appearance";
import { colors, Sheet } from "./ui";

export function HelpButton({
  label,
  title,
  children,
}: PropsWithChildren<{
  label: string;
  title: string;
}>) {
  useAppearance();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Açıklamayı açar"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        hitSlop={4}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="help-circle-outline" size={22} color={colors.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  );
}
