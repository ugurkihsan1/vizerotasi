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
  type TextInputProps,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
export const colors = {
  navy: "#182E43",
  blue: "#24766C",
  bg: "#F5F5F0",
  text: "#263E4F",
  muted: "#6D7D87",
  green: "#13835A",
  amber: "#B16B12",
  red: "#BC4653",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: -0.8,
    fontWeight: "800",
    color: colors.navy,
  },
  heading: {
    fontSize: 18,
    letterSpacing: -0.3,
    fontWeight: "700",
    color: colors.navy,
  },
  text: { fontSize: 15, lineHeight: 23, color: colors.text },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E9EDE8",
    padding: 20,
    gap: 14,
    shadowColor: colors.navy,
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 1,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#DDE5F0",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "#EAF0ED",
  },
  pillText: { fontSize: 13, fontWeight: "600", color: colors.navy },
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
        backgroundColor: secondary ? "#EAF0ED" : colors.blue,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          fontWeight: "700",
          color: secondary ? colors.navy : "#FFF",
          fontSize: 14,
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
          backgroundColor: active ? colors.navy : "#E8EEF7",
        },
      ]}
    >
      <Text style={[styles.pillText, { color: active ? "#FFF" : colors.navy }]}>
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
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8190A5"
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#071B4380",
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
              backgroundColor: "#CED8D2",
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
                backgroundColor: "#EAF0ED",
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
      </View>
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
  return (
    <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 23,
          backgroundColor: "#E7EFEB",
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
              backgroundColor: "#EAF0ED",
              borderRadius: 12,
            }}
          />
          <View
            style={{ height: 80, backgroundColor: "#F1F4F9", borderRadius: 12 }}
          />
        </View>
      ))}
    </View>
  );
}
export function Busy() {
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
  return text ? (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.text, { color: colors.amber }]}
    >
      {text}
    </Text>
  ) : null;
}
