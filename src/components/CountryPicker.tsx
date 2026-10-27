import { useAppearance } from "../lib/appearance";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCountries } from "../lib/data";
import { CountryFlag } from "./CountryFlag";
import { Sheet, Field, styles, colors, Button } from "./ui";
export function CountryPicker({
  value,
  onChange,
  label = "Başvuru ülkesi",
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  useAppearance();

  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const q = useCountries();
  const selected = q.data?.find((c) => c.id === value);
  const query = search.trim().toLocaleLowerCase("tr");
  const matches = q.data?.filter((c) =>
    `${c.name} ${c.code}`.toLocaleLowerCase("tr").includes(query),
  );
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.muted}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name ?? "Ülke seç"}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {selected && (
          <CountryFlag
            code={selected.code}
            emoji={selected.flag}
            name={selected.name}
          />
        )}
        <Text style={[styles.text, { flex: 1 }]}>
          {selected?.name ?? "Ülke seç"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Sheet title="Ülke seç" visible={open} onClose={() => setOpen(false)}>
        <Field
          label="Ülke ara"
          value={search}
          onChangeText={setSearch}
          placeholder="Örn. Almanya"
          autoCorrect={false}
        />
        {matches?.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityLabel={c.name}
            accessibilityState={{ checked: c.id === value }}
            onPress={() => {
              onChange(c.id);
              setOpen(false);
            }}
            style={{
              minHeight: 50,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 8,
            }}
          >
            <CountryFlag code={c.code} emoji={c.flag} name={c.name} />
            <Text style={[styles.text, { flex: 1 }]}>{c.name}</Text>
            {value === c.id && (
              <Ionicons name="checkmark" size={20} color={colors.green} />
            )}
          </Pressable>
        ))}
        {!q.isPending && !q.isError && !matches?.length && (
          <Text style={styles.muted}>Bu aramayla eşleşen ülke bulunamadı.</Text>
        )}
        {q.isPending && <Text style={styles.muted}>Ülkeler yükleniyor…</Text>}
        {q.isError && (
          <Button
            secondary
            label="Ülkeleri yeniden yükle"
            onPress={() => void q.refetch()}
          />
        )}
      </Sheet>
    </View>
  );
}
