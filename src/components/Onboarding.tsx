import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useCountries } from "../lib/data";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { Sheet, Button, Chip, styles, Message } from "./ui";
const screens = [
  [
    "Gerçek deneyimleri keşfet.",
    "Aynı yoldan geçen insanların paylaşımlarına göz at.",
  ],
  [
    "Sana benzeyen başvuruları bul.",
    "Ülke, çalışma durumu ve sonuçla akışını filtrele.",
  ],
  [
    "Sor, paylaş, birlikte yol al.",
    "Her katkı bir sonraki yolcuya ışık tutar.",
  ],
];
export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const { data: countries } = useCountries();
  const { session } = useAuth();
  const cache = useQueryClient();
  useEffect(() => {
    void AsyncStorage.getItem("onboarding-v1")
      .then((x) => {
        if (!x) setOpen(true);
      })
      .catch(() => {});
  }, []);
  async function finish() {
    try {
      if (session && selected.length) {
        const r = await db()
          .from("followed_countries")
          .upsert(
            selected.map((country_id) => ({
              user_id: session.user.id,
              country_id,
            })),
          );
        if (r.error) throw r.error;
        await cache.invalidateQueries({ queryKey: ["follows"] });
      }
      await AsyncStorage.setItem("onboarding-v1", "done");
      await AsyncStorage.setItem(
        "guest-country-interests",
        JSON.stringify(selected),
      );
      await cache.invalidateQueries({ queryKey: ["follows"] });
      setOpen(false);
    } catch {
      setMessage("Tercihlerin kaydedilemedi. Tekrar deneyebilirsin.");
    }
  }
  return (
    <Sheet
      visible={open}
      onClose={() => void finish()}
      title={
        step < 3 ? "Vize Rotası’na hoş geldin" : "İlgilendiğin ülkeleri seç"
      }
    >
      {step < 3 ? (
        <View style={{ gap: 20 }}>
          <Text style={{ fontSize: 45 }}>{["✦", "◎", "↗"][step]}</Text>
          <Text style={styles.title}>{screens[step][0]}</Text>
          <Text style={styles.text}>{screens[step][1]}</Text>
          <Text style={styles.muted}>{step + 1} / 3</Text>
          <Button label="Devam" onPress={() => setStep(step + 1)} />
        </View>
      ) : (
        <>
          <View style={styles.row}>
            {countries?.map((c) => (
              <Chip
                key={c.id}
                label={`${c.flag} ${c.name}`}
                active={selected.includes(c.id)}
                onPress={() =>
                  setSelected(
                    selected.includes(c.id)
                      ? selected.filter((x) => x !== c.id)
                      : [...selected, c.id],
                  )
                }
              />
            ))}
          </View>
          <Text style={styles.muted}>
            Şimdilik seçim yapmadan da devam edebilirsin.
          </Text>
          <Message text={message} />
          <Button label="Akışıma git" onPress={() => void finish()} />
        </>
      )}
    </Sheet>
  );
}
