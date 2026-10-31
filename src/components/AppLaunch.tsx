import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useIsRestoring } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useAppearance } from "../lib/appearance";
import { Brand } from "./Brand";
import { colors } from "./ui";

export function LaunchScreen() {
  useAppearance();
  return (
    <View
      accessibilityLabel="Vizesel açılıyor"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
      }}
    >
      <Brand cover />
    </View>
  );
}

/** Covers session/profile restoration, never routine background profile refreshes. */
export function AppLaunchOverlay() {
  const { loading, profileLoading } = useAuth();
  const restoring = useIsRestoring();
  const { motionReduced } = useAppearance();
  const busy = loading || profileLoading || restoring;
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));
  const shownAt = useRef(0);
  if (busy && !visible) setVisible(true);

  useEffect(() => {
    if (busy) {
      shownAt.current = Date.now();
      opacity.setValue(1);
      return;
    }
    if (!shownAt.current) shownAt.current = Date.now();
    let active = true;
    const timer = setTimeout(
      () => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: motionReduced ? 0 : 300,
          useNativeDriver: Platform.OS !== "web",
        }).start(({ finished }) => {
          if (active && finished) setVisible(false);
        });
      },
      motionReduced ? 0 : Math.max(0, 350 - (Date.now() - shownAt.current)),
    );
    return () => {
      active = false;
      clearTimeout(timer);
      opacity.stopAnimation();
    };
  }, [busy, opacity, motionReduced]);

  if (!visible) return null;
  return (
    <Animated.View
      testID="launch-overlay"
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: busy ? 1 : opacity,
          zIndex: 1000,
          elevation: 1000,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <LaunchScreen />
    </Animated.View>
  );
}
