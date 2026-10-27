import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useAppearance } from "../lib/appearance";
import { colors } from "./ui";
export function PlaneReaction({ active = false }: { active?: boolean }) {
  const { motionReduced } = useAppearance(),
    [progress] = useState(() => new Animated.Value(0)),
    previous = useRef(active),
    [filled, setFilled] = useState(active);
  useEffect(() => {
    const justActivated = active && !previous.current;
    previous.current = active;
    progress.stopAnimation();
    progress.setValue(0);
    if (justActivated && !motionReduced) {
      setFilled(false);
      const flight = Animated.timing(progress, {
        toValue: 1,
        duration: 280,
        useNativeDriver: Platform.OS !== "web",
      });
      flight.start(({ finished }) => {
        if (finished) setFilled(true);
      });
      return () => flight.stop();
    }
    setFilled(active);
  }, [active, motionReduced, progress]);
  return (
    <Animated.View
      testID={filled ? "reaction-plane-filled" : "reaction-plane-outline"}
      style={{
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 9, 0],
            }),
          },
          {
            translateY: progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, -10, 0],
            }),
          },
          {
            rotate: progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: ["0deg", "-18deg", "0deg"],
            }),
          },
        ],
      }}
    >
      <Ionicons
        name={filled ? "airplane" : "airplane-outline"}
        size={23}
        color={filled ? colors.green : colors.muted}
      />
    </Animated.View>
  );
}
