import {
  isDark,
  textSize,
  themeColor,
  useAppearance,
  darkPalette,
  lightPalette,
} from "../lib/appearance";

import { Ionicons } from "@expo/vector-icons";
import { useState, type PropsWithChildren } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  type TextInputProps,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
export const colors = {
  get navy() {
    return isDark() ? darkPalette.heading : lightPalette.heading;
  },
  get blue() {
    return isDark() ? darkPalette.accent : lightPalette.accent;
  },
  get bg() {
    return isDark() ? darkPalette.background : lightPalette.background;
  },
  get text() {
    return isDark() ? darkPalette.text : lightPalette.text;
  },
  get muted() {
    return isDark() ? darkPalette.muted : lightPalette.muted;
  },
  get green() {
    return isDark() ? "#58CC98" : "#13835A";
  },
  get amber() {
    return isDark() ? "#E6B666" : "#B16B12";
  },
  get red() {
    return isDark() ? "#F1848E" : "#BC4653";
  },
};
const createStyles = () =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    title: {
      fontSize: textSize(27),
      lineHeight: textSize(34),
      letterSpacing: -0.8,
      fontWeight: "800",
      color: colors.navy,
    },
    heading: {
      fontSize: textSize(18),
      letterSpacing: -0.3,
      fontWeight: "700",
      color: colors.navy,
    },
    text: {
      fontSize: textSize(15),
      lineHeight: textSize(23),
      color: colors.text,
    },
    muted: {
      fontSize: textSize(13),
      lineHeight: textSize(20),
      color: colors.muted,
    },
    card: {
      backgroundColor: themeColor("#FFF", "surface"),
      borderRadius: 22,
      borderWidth: 1,
      borderColor: themeColor("#E9EDE8", "border"),
      padding: 20,
      gap: 14,
      shadowColor: colors.navy,
      shadowOpacity: 0.035,
      shadowRadius: 12,
      elevation: 1,
    },
    timeline: {
      backgroundColor: isDark() ? darkPalette.background : "#FFFFFF",
      borderRadius: 0,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderColor: themeColor("#DFE5E8", "border"),
      padding: 16,
      gap: 10,
      shadowOpacity: 0,
      elevation: 0,
    },
    input: {
      backgroundColor: themeColor("#FFF", "surface"),
      borderRadius: 14,
      padding: 14,
      fontSize: textSize(16),
      color: colors.text,
      minHeight: 50,
      borderWidth: 1,
      borderColor: themeColor("#DDE5F0", "border"),
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 22,
      backgroundColor: themeColor("#EAF0ED", "surface"),
    },
    pillText: { fontSize: textSize(13), fontWeight: "600", color: colors.navy },
  });
type UIStyles = ReturnType<typeof createStyles>;
let cachedStyles = createStyles(),
  cachedTheme = "";
export const styles = new Proxy({} as UIStyles, {
  get(_target, key: keyof UIStyles) {
    const theme = String(isDark()) + ":" + String(textSize(10));
    if (cachedTheme !== theme) {
      cachedStyles = createStyles();
      cachedTheme = theme;
    }
    return cachedStyles[key];
  },
});
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  useAppearance();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: secondary
          ? isDark()
            ? "#515151"
            : lightPalette.border
          : "transparent",
        backgroundColor: secondary
          ? isDark()
            ? darkPalette.raised
            : lightPalette.raised
          : isDark()
            ? "#E8E8E8"
            : themeColor("#24766C", "surface"),
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          fontWeight: "700",
          color: secondary
            ? colors.navy
            : isDark()
              ? darkPalette.background
              : themeColor("#FFF", "text"),
          fontSize: textSize(14),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  useAppearance();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      aria-pressed={!!active}
      onPress={onPress}
      style={[
        styles.pill,
        {
          minHeight: 44,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: isDark()
            ? active
              ? darkPalette.accent
              : darkPalette.border
            : "transparent",
          backgroundColor: active
            ? isDark()
              ? "#303030"
              : lightPalette.heading
            : themeColor("#E8EEF7", "surface"),
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: active ? themeColor("#FFF", "text") : colors.navy },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  useAppearance();

  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={themeColor("#8190A5", "text")}
        style={[
          styles.input,
          props.multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
        {...props}
      />
      {error && <Text style={{ color: colors.red }}>{error}</Text>}
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
}>) {
  const { motionReduced } = useAppearance();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={motionReduced ? "none" : "slide"}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: themeColor("#071B4380", "surface"),
        }}
      >
        <Pressable
          accessibilityLabel="Kapat"
          style={{ flex: 1 }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "85%",
            padding: 24,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            gap: 16,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark()
                ? "#505050"
                : themeColor("#CED8D2", "surface"),
              alignSelf: "center",
            }}
          />
          <View style={styles.row}>
            <Text style={[styles.heading, { flex: 1 }]}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={onClose}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: themeColor("#EAF0ED", "surface"),
              }}
            >
              <Ionicons name="close" size={22} color={colors.navy} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Empty({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body?: string;
  action?: string;
  onPress?: () => void;
}) {
  useAppearance();

  return (
    <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 23,
          backgroundColor: themeColor("#E7EFEB", "surface"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="chatbubbles-outline" size={28} color={colors.blue} />
      </View>
      <Text style={[styles.heading, { textAlign: "center" }]}>{title}</Text>
      {body && (
        <Text style={[styles.muted, { textAlign: "center" }]}>{body}</Text>
      )}
      {action && onPress && <Button label={action} onPress={onPress} />}
    </View>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  useAppearance();

  return (
    <Empty
      title="Bağlantı kurulamadı"
      body="İnternet bağlantını kontrol edip yeniden deneyebilirsin."
      action="Tekrar dene"
      onPress={retry}
    />
  );
}
export function Skeleton() {
  useAppearance();

  return (
    <View
      accessibilityLabel="Paylaşımlar yükleniyor"
      style={{ gap: 14, padding: 20 }}
    >
      {[1, 2, 3].map((x) => (
        <View key={x} style={[styles.card, { height: 210 }]}>
          <View
            style={{
              height: 30,
              width: "45%",
              backgroundColor: themeColor("#EAF0ED", "surface"),
              borderRadius: 12,
            }}
          />
          <View
            style={{
              height: 80,
              backgroundColor: themeColor("#F1F4F9", "surface"),
              borderRadius: 12,
            }}
          />
        </View>
      ))}
    </View>
  );
}
export function Busy() {
  useAppearance();

  return (
    <ActivityIndicator color={colors.blue} accessibilityLabel="Yükleniyor" />
  );
}
export function useGate() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  return {
    require: (action: () => void) => (session ? action() : setOpen(true)),
    view: (
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Topluluğa katıl"
      >
        <Text style={styles.text}>
          Deneyim paylaşmak, kaydetmek ve yanıtlamak için hesabına giriş yap.
        </Text>
        <Button
          label="Giriş yap / Üye ol"
          onPress={() => {
            setOpen(false);
            router.push("/auth");
          }}
        />
      </Sheet>
    ),
  };
}
export function Message({ text }: { text: string }) {
  useAppearance();

  return text ? (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.text, { color: colors.amber }]}
    >
      {text}
    </Text>
  ) : null;
}
