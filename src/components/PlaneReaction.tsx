import { Text, View } from "react-native";
export function PlaneReaction({ active = false }: { active?: boolean }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#D9EEE5" : "transparent",
        opacity: active ? 1 : 0.65,
      }}
    >
      <Text accessible={false} style={{ fontSize: 20 }}>
        ✈️
      </Text>
    </View>
  );
}
