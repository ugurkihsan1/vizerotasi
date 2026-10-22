import { SearchMatches } from "../../src/components/SearchMatches";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/lib/auth";
import { useCountries } from "../../src/lib/data";
import { router, useLocalSearchParams } from "expo-router";
import { Feed } from "../../src/components/Feed";
import { Field, Chip, styles, colors } from "../../src/components/ui";
import { DestinationArt } from "../../src/components/DestinationArt";
import { SpainFeature } from "../../src/components/HomeSections";
export default function Discover() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? "");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const { session } = useAuth();
  const key = `recent-searches:${session?.user.id ?? "guest"}`;
  const { data: countries } = useCountries();
  useEffect(() => {
    void AsyncStorage.getItem(key)
      .then((x) => setRecent(x ? JSON.parse(x) : []))
      .catch(() => {});
  }, [key]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);
  const remember = (value: string) => {
    const next = [value, ...recent.filter((x) => x !== value)]
      .filter(Boolean)
      .slice(0, 6);
    setRecent(next);
    void AsyncStorage.setItem(key, JSON.stringify(next));
  };
  return (
    <Feed
      search={search}
      header={
        <View style={{ gap: 22 }}>
          <View style={{ gap: 5 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.4,
                color: colors.blue,
              }}
            >
              MERAK ETTİĞİN HER ŞEY
            </Text>
            <Text style={styles.title}>Senin rotan hangisi?</Text>
            <Text style={styles.muted}>
              Ülkeleri tanı, deneyimleri keşfet, hazırlığını yap.
            </Text>
          </View>
          <Field
            label="Ülke, belge, deneyim veya soru ara"
            placeholder="Örn. İspanya, banka hesabı…"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => remember(text.trim())}
            returnKeyType="search"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {["İlk Schengen", "Banka hesabı", "Öğrenci", "Ret"].map((x) => (
              <Chip
                key={x}
                label={x}
                onPress={() => {
                  setText(x);
                  remember(x);
                }}
              />
            ))}
          </ScrollView>
          {recent.length > 0 && (
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={styles.muted}>Son aramalar</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Arama geçmişini temizle"
                  onPress={() => {
                    setRecent([]);
                    void AsyncStorage.removeItem(key);
                  }}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 12, color: colors.blue }}>
                    Temizle
                  </Text>
                </Pressable>
              </View>
              <View style={styles.row}>
                {recent.map((x) => (
                  <Chip key={x} label={x} onPress={() => setText(x)} />
                ))}
              </View>
            </View>
          )}
          <View style={{ gap: 12 }}>
            <Text style={styles.heading}>
              {search ? "Eşleşen ülkeler" : "Bir ülkeyle başla"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {countries
                ?.filter(
                  (c) =>
                    !search ||
                    c.name
                      .toLocaleLowerCase("tr")
                      .includes(search.toLocaleLowerCase("tr")),
                )
                .map((c) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="link"
                    accessibilityLabel={`${c.name} topluluğuna git`}
                    onPress={() => router.push(`/country/${c.id}`)}
                    style={{
                      width: "47.8%",
                      flexGrow: 1,
                      maxWidth: "50%",
                      borderRadius: 20,
                      overflow: "hidden",
                      backgroundColor: "#FFF",
                      borderWidth: 1,
                      borderColor: "#E4E9E2",
                    }}
                  >
                    <DestinationArt id={c.id} height={106} />
                    <View
                      style={{
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <Text style={{ fontSize: 17 }}>{c.flag}</Text>
                      <Text style={[styles.pillText, { flex: 1 }]}>
                        {c.name}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={15}
                        color={colors.muted}
                      />
                    </View>
                  </Pressable>
                ))}
            </View>
          </View>
          {!search && <SpainFeature />}
          <SearchMatches search={search} />
          <Text style={styles.heading}>
            {search ? "Topluluktan sonuçlar" : "Son paylaşımlar"}
          </Text>
        </View>
      }
    />
  );
}
