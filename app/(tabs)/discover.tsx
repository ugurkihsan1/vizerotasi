import { SearchMatches } from "../../src/components/SearchMatches";
import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/lib/auth";
import { useCountries } from "../../src/lib/data";
import { router, useLocalSearchParams } from "expo-router";
import { Feed } from "../../src/components/Feed";
import { Field, Chip, Button, styles } from "../../src/components/ui";
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
        <View style={{ gap: 16 }}>
          <Text style={styles.title}>Birlikte keşfedelim.</Text>
          <Field
            label="Ülke, belge, deneyim veya soru ara"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => remember(text.trim())}
            returnKeyType="search"
          />
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {[
              "İlk Schengen",
              "Banka hesabı",
              "Ret",
              "Öğrenci",
              "Davet mektubu",
              "VFS",
              "iDATA",
            ].map((x) => (
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
              <Text style={styles.muted}>Son aramalar</Text>
              <View style={styles.row}>
                {recent.map((x) => (
                  <Chip key={x} label={x} onPress={() => setText(x)} />
                ))}
              </View>
              <Button
                label="Arama geçmişini temizle"
                secondary
                onPress={() => {
                  setRecent([]);
                  void AsyncStorage.removeItem(key);
                }}
              />
            </View>
          )}
          {countries
            ?.filter(
              (c) =>
                !search ||
                c.name
                  .toLocaleLowerCase("tr")
                  .includes(search.toLocaleLowerCase("tr")),
            )
            .map((c) => (
              <Chip
                key={c.id}
                label={`${c.flag} ${c.name}`}
                onPress={() => router.push(`/country/${c.id}`)}
              />
            ))}
          <SearchMatches search={search} />
          <Text style={styles.heading}>
            {search ? "Arama sonuçları" : "Toplulukta keşfet"}
          </Text>
        </View>
      }
    />
  );
}
