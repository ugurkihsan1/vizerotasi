import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { finishAuth } from "../lib/auth-navigation";
import { signInSocial, type SocialProvider } from "../lib/social-auth";
import { authErrorMessage } from "../lib/auth-errors";
import { useAppearance, themeColor } from "../lib/appearance";
import { colors, styles } from "./ui";

export function SocialSignIn({
  disabled,
  onBusyChange,
  onError,
}: {
  disabled: boolean;
  onBusyChange: (value: boolean) => void;
  onError: (message: string) => void;
}) {
  const { dark } = useAppearance();
  const [provider, setProvider] = useState<SocialProvider | null>(null);
  const start = async (next: SocialProvider) => {
    if (disabled || provider) return;
    setProvider(next);
    onBusyChange(true);
    onError("");
    try {
      const result = await signInSocial(next);
      if (result === "signed-in") finishAuth();
    } catch (error) {
      onError(authErrorMessage(error));
    } finally {
      setProvider(null);
      onBusyChange(false);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      {Platform.OS === "ios" ? (
        <View
          pointerEvents={disabled ? "none" : "auto"}
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              dark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={{ height: 48, width: "100%" }}
            onPress={() => void start("apple")}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apple ile devam et"
          disabled={disabled}
          onPress={() => void start("apple")}
          style={{
            minHeight: 48,
            borderRadius: 12,
            backgroundColor: dark ? "#FFFFFF" : "#111111",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Ionicons
            name="logo-apple"
            size={21}
            color={dark ? "#111111" : "#FFFFFF"}
          />
          <Text
            style={{
              color: dark ? "#111111" : "#FFFFFF",
              fontWeight: "600",
              fontSize: 15,
            }}
          >
            Apple ile devam et
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Google ile devam et"
        disabled={disabled}
        onPress={() => void start("google")}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: themeColor("#DADCE0", "border"),
          backgroundColor: themeColor("#FFFFFF", "surface"),
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Image
          source={require("../../assets/google-g.png")}
          style={{ width: 20, height: 20 }}
          contentFit="contain"
          accessibilityLabel="Google"
        />
        <Text style={{ color: colors.navy, fontWeight: "600", fontSize: 15 }}>
          {provider === "google" ? "Bağlanıyor…" : "Google ile devam et"}
        </Text>
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
          marginTop: 6,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: themeColor("#E6E6E6", "border"),
          }}
        />
        <Text style={styles.muted}>veya e-posta ile</Text>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: themeColor("#E6E6E6", "border"),
          }}
        />
      </View>
    </View>
  );
}
