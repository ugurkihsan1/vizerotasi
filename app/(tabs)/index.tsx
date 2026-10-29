import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "../../src/components/Brand";
import { MessagesEntry } from "../../src/components/ChatEntry";
import { useAppearance, textSize } from "../../src/lib/appearance";
import { useAuth } from "../../src/lib/auth";
import { useRef, useState } from "react";
import { ScrollView, View, Pressable, Text, Animated, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { router } from "expo-router";
import { Feed } from "../../src/components/Feed";
import { Onboarding } from "../../src/components/Onboarding";
import { useGroups, ERASMUS_GROUP } from "../../src/lib/groups";
import { GroupScreen } from "../group/[id]";
import { colors } from "../../src/components/ui";
export default function Home() {
  useAppearance();

  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [headerY] = useState(() => new Animated.Value(0));
  const lastOffset = useRef(0);
  const hiddenDistance = useRef(0);
  const onFeedScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = y - lastOffset.current;
    lastOffset.current = y;
    hiddenDistance.current = y <= 0 ? 0 : Math.max(0, Math.min(56, hiddenDistance.current + delta));
    headerY.setValue(-hiddenDistance.current);
  };
  const [scope, setScope] = useState("Tümü"),
    groups = useGroups();
  const followedGroups = groups.data?.filter(
    (g) =>
      g.is_system ||
      g.is_manager ||
      g.my_status === "active" ||
      g.my_status === "pending",
  );
  const available = groups.data
    ? (followedGroups ?? [])
    : [{ id: ERASMUS_GROUP, name: "Erasmus" }];
  const tabs = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 16, alignItems: "center" }}
    >
      {[
        ...["Tümü", "Deneyimler", "Sorular"].map((name) => ({
          id: name,
          name,
        })),
        ...available,
      ].map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityLabel={item.name}
          accessibilityState={{ selected: scope === item.id }}
          aria-selected={scope === item.id}
          onPress={() => setScope(item.id)}
          style={{
            minHeight: 44,
            justifyContent: "center",
            borderBottomWidth: scope === item.id ? 2 : 0,
            borderBottomColor: colors.blue,
          }}
        >
          <Text
            style={{
              fontSize: textSize(14),
              fontWeight: scope === item.id ? "700" : "500",
              color: scope === item.id ? colors.blue : colors.muted,
            }}
          >
            {item.name}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Topluluk ekle veya yönet"
        onPress={() => router.push("/groups")}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: textSize(24), color: colors.blue }}>＋</Text>
      </Pressable>
    </ScrollView>
  );
  const general = ["Tümü", "Deneyimler", "Sorular"].includes(scope);
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {general ? (
        <Feed
          key={scope}
          homeTabs={tabs}
          onScroll={onFeedScroll}
          homeKind={
            scope === "Deneyimler"
              ? "experience"
              : scope === "Sorular"
                ? "question"
                : undefined
          }
        />
      ) : (
        <View style={{ flex: 1, paddingTop: 56 }}><GroupScreen
          onDeleted={() => setScope("Tümü")}
          key={`${scope}:${session?.user.id ?? "guest"}`}
          id={scope}
          top={tabs}
        /></View>
      )}
      <Animated.View style={{ position: "absolute", top: insets.top, left: 0, right: 0, height: 56, backgroundColor: colors.bg, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", transform: [{ translateY: general ? headerY : 0 }] }}>
        <Brand />
        <MessagesEntry />
      </Animated.View>
      <Onboarding />
    </View>
  );
}
