import { useAppearance, textSize } from "../lib/appearance";
import { useInfiniteQuery } from "@tanstack/react-query";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { db, configured } from "../lib/supabase";
import { containsAllWords } from "../lib/search";
import { useCountries } from "../lib/data";
import { Button, styles, Empty, Sheet, Busy, colors } from "./ui";
import { CountryFlag } from "./CountryFlag";
import { useState } from "react";
import type { Document, Profile } from "../lib/types";
const PAGE_SIZE = 12;
export function SearchMatches({
  search,
  countryIds = [],
  mode,
}: {
  search: string;
  countryIds?: string[];
  mode: "documents" | "people";
}) {
  useAppearance();

  const [selected, setSelected] = useState<Document | null>(null);
  const { data: countries } = useCountries();
  const q = useInfiniteQuery({
    queryKey: ["global-search", mode, search, countryIds],
    enabled: configured,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (mode === "people") {
        let query = db()
          .from("profiles")
          .select("*")
          .order("username")
          .order("id")
          .range(pageParam, pageParam + PAGE_SIZE - 1);
        const filter = containsAllWords(search, ["username", "display_name"]);
        if (filter) query = query.or(filter);
        const r = await query;
        if (r.error) throw r.error;
        return r.data as Profile[];
      }
      let query = db()
        .from("country_documents")
        .select("*")
        .order("country_id")
        .order("id")
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (countryIds.length) query = query.in("country_id", countryIds);
      const filter = containsAllWords(search);
      if (filter) query = query.or(filter);
      const r = await query;
      if (r.error) throw r.error;
      return r.data as Document[];
    },
    getNextPageParam: (last, pages) =>
      last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });
  const results = q.data?.pages.flat() ?? [];
  const selectedCountry = countries?.find((c) => c.id === selected?.country_id);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.heading}>
        {mode === "documents"
          ? "Ülkelere göre belgeler"
          : "Topluluktan kişiler"}
      </Text>
      {q.isPending ? (
        <Busy />
      ) : q.isError ? (
        <Empty
          title="Arama tamamlanamadı"
          action="Yeniden dene"
          onPress={() => void q.refetch()}
        />
      ) : !results.length ? (
        <Empty
          title={
            mode === "documents"
              ? "Bu aramada belge bulunamadı"
              : "Bu aramada kişi bulunamadı"
          }
        />
      ) : null}
      {mode === "people"
        ? (results as Profile[]).map((p) => (
            <Button
              key={p.id}
              secondary
              label={`@${p.username} · ${p.display_name}`}
              onPress={() => router.push(`/profile/${p.username}`)}
            />
          ))
        : (results as Document[]).map((d) => {
            const country = countries?.find((c) => c.id === d.country_id);
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={`${country?.name ?? "Ülke"} · ${d.title}`}
                onPress={() => setSelected(d)}
                style={[styles.card, { padding: 15, gap: 7 }]}
              >
                <View style={styles.row}>
                  {country && (
                    <CountryFlag
                      code={country.code}
                      emoji={country.flag}
                      name={country.name}
                    />
                  )}
                  <Text
                    style={{
                      color: colors.blue,
                      fontWeight: "700",
                      fontSize: textSize(12),
                    }}
                  >
                    {country?.name ?? "Ülke bilgisi bulunamadı"} · Belge
                  </Text>
                </View>
                <Text style={styles.pillText}>{d.title}</Text>
                <Text style={styles.muted} numberOfLines={2}>
                  {d.body}
                </Text>
              </Pressable>
            );
          })}
      {q.hasNextPage && (
        <Button
          secondary
          label={q.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla sonuç"}
          disabled={q.isFetchingNextPage}
          onPress={() => void q.fetchNextPage()}
        />
      )}
      <Sheet
        visible={!!selected}
        title={`${selectedCountry?.name ?? "Ülke"} · ${selected?.title ?? "Belge"}`}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.text}>{selected?.body}</Text>
        <Button
          label={`${selectedCountry?.name ?? "Ülke"} belge checklistine git`}
          onPress={() => {
            const id = selected?.country_id;
            setSelected(null);
            if (id)
              router.push({
                pathname: "/country/[id]",
                params: { id, tab: "Belgeler" },
              });
          }}
        />
      </Sheet>
    </View>
  );
}
