import { useAppearance, themeColor, textSize } from "../lib/appearance";
import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useCountries } from "../lib/data";
import { CountryFlag } from "./CountryFlag";
import { Sheet, Button, styles, colors } from "./ui";
const plans = [
  {
    id: "booked",
    title: "Randevumu aldım",
    description: "Belgelerimi kontrol etmek istiyorum.",
  },
  {
    id: "appointment",
    title: "Randevu almayı planlıyorum",
    description: "Başvuruya nereden başlayacağımı öğrenmek istiyorum.",
  },
  {
    id: "travel",
    title: "Seyahat planlıyorum",
    description: "Gideceğim ülkenin başvuru koşullarını keşfetmek istiyorum.",
  },
  {
    id: "none",
    title: "Şimdilik bir planım yok",
    description: "Topluluğa göz atmak istiyorum.",
  },
] as const;
type Plan = (typeof plans)[number]["id"];
export function Onboarding() {
  useAppearance();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<Plan>();
  const [countryId, setCountryId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: countries, isPending, isError, refetch } = useCountries();
  const country = countries?.find((c) => c.id === countryId);
  const cache = useQueryClient();
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem("onboarding-planner-v1")
      .then((value) => {
        if (active && !value) setOpen(true);
      })
      .catch(() => {
        if (active) setOpen(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function navigate(destination?: "documents" | "guide") {
    setOpen(false);
    if (destination && country)
      router.push({
        pathname: "/country/[id]",
        params: {
          id: country.id,
          tab: destination === "documents" ? "Belgeler" : "Rehber",
        },
      });
  }
  async function finish(destination?: "documents" | "guide", skipped = false) {
    if (busy) return;
    setBusy(true);
    try {
      if (!skipped && plan) {
        await AsyncStorage.setItem(
          "travel-plan:v1",
          JSON.stringify({ status: plan, country_id: country?.id ?? null }),
        );
        if (country) {
          const saved = await AsyncStorage.getItem("guest-country-interests");
          let interests: unknown;
          try {
            interests = saved ? JSON.parse(saved) : [];
          } catch {
            interests = [];
          }
          await AsyncStorage.setItem(
            "guest-country-interests",
            JSON.stringify([
              ...new Set([
                ...(Array.isArray(interests)
                  ? interests.filter((x) => typeof x === "string")
                  : []),
                country.id,
              ]),
            ]),
          );
          void cache.invalidateQueries({ queryKey: ["follows"] });
        }
      }
      await AsyncStorage.setItem("onboarding-planner-v1", "done");
      void cache.invalidateQueries({ queryKey: ["local-travel-plan"] });
      void cache.invalidateQueries({ queryKey: ["home-checklist"] });
    } catch {
      // Storage may be unavailable in private browsing; never block access to the guide.
    } finally {
      setBusy(false);
      navigate(destination);
    }
  }
  return (
    <Sheet
      visible={open}
      onClose={() => void finish(undefined, true)}
      title="Rotanı birlikte planlayalım"
    >
      <View style={{ gap: 16 }}>
        <Text style={[styles.muted, { color: colors.blue }]}>
          {step + 1} / 3 · Sana uygun başlangıç
        </Text>
        {step === 0 && (
          <>
            <Text style={styles.title}>
              Yakında bir randevu ya da seyahat planın var mı?
            </Text>
            <Text style={styles.muted}>
              Sana doğru ülkenin rehberini ve belge listesini gösterelim.
            </Text>
            {plans.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={option.title}
                accessibilityState={{ checked: plan === option.id }}
                onPress={() => setPlan(option.id)}
                style={[
                  styles.card,
                  {
                    padding: 15,
                    gap: 4,
                    borderColor:
                      plan === option.id
                        ? colors.blue
                        : themeColor("#E9EDE8", "border"),
                    backgroundColor:
                      plan === option.id
                        ? themeColor("#EAF3ED", "surface")
                        : themeColor("#FFF", "surface"),
                  },
                ]}
              >
                <Text style={styles.pillText}>
                  {plan === option.id ? "● " : "○ "}
                  {option.title}
                </Text>
                <Text style={styles.muted}>{option.description}</Text>
              </Pressable>
            ))}
            <Button
              label={plan === "none" ? "Topluluğu keşfet" : "Devam"}
              disabled={!plan || busy}
              onPress={() => (plan === "none" ? void finish() : setStep(1))}
            />
          </>
        )}
        {step === 1 && (
          <>
            <Text style={styles.title}>
              {plan === "booked"
                ? "Hangi ülke için randevu aldın?"
                : plan === "appointment"
                  ? "Hangi ülke için randevu alacaksın?"
                  : "Hangi ülkeye seyahat etmeyi planlıyorsun?"}
            </Text>
            <Text style={styles.muted}>Başvuracağın ülkeyi seç.</Text>
            <View style={styles.row}>
              {countries?.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityLabel={c.name}
                  accessibilityState={{ checked: countryId === c.id }}
                  onPress={() => setCountryId(c.id)}
                  style={[
                    styles.pill,
                    {
                      minHeight: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 9,
                      borderWidth: 1,
                      borderColor:
                        countryId === c.id ? colors.blue : "transparent",
                      backgroundColor:
                        countryId === c.id
                          ? themeColor("#DDEDE3", "surface")
                          : themeColor("#FFF", "surface"),
                    },
                  ]}
                >
                  <CountryFlag code={c.code} emoji={c.flag} name={c.name} />
                  <Text style={styles.pillText}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
            {isPending && <Text style={styles.muted}>Ülkeler yükleniyor…</Text>}
            {isError && (
              <Button
                secondary
                label="Ülkeleri yeniden yükle"
                onPress={() => void refetch()}
              />
            )}
            <Button
              label="Devam"
              disabled={!country}
              onPress={() => setStep(2)}
            />
            <Button secondary label="Geri" onPress={() => setStep(0)} />
          </>
        )}
        {step === 2 && country && (
          <>
            <Text style={{ fontSize: textSize(36) }}>
              {plan === "booked" ? "✓" : "↗"}
            </Text>
            <Text style={styles.title}>
              {plan === "booked"
                ? "Randevun hazır. Peki belgelerin?"
                : `${country.name} rotan için ilk adım`}
            </Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <CountryFlag
                  code={country.code}
                  emoji={country.flag}
                  name={country.name}
                />
                <Text style={styles.heading}>{country.name}</Text>
              </View>
              <Text style={styles.text}>
                {plan === "booked"
                  ? "Belge checklistinde hazırladıklarını işaretle, eksik kalanları kolayca gör. Seçimlerin bu cihazda saklanır."
                  : "Başvuru adımlarını ve resmî kaynaklara dayanan belge listesini ülke rehberinde incele."}
              </Text>
              <Text style={styles.muted}>
                Liste turistik vize kapsamındadır; başvuru türüne göre güncel
                resmî koşulları da kontrol et.
              </Text>
            </View>
            <Button
              label={
                plan === "booked"
                  ? "Belge checklistine git"
                  : "Ülke rehberine git"
              }
              disabled={busy}
              onPress={() =>
                void finish(plan === "booked" ? "documents" : "guide")
              }
            />
            <Button
              secondary
              label="Şimdilik topluluğu keşfet"
              disabled={busy}
              onPress={() => void finish()}
            />
            <Button
              secondary
              label="Geri"
              disabled={busy}
              onPress={() => setStep(1)}
            />
          </>
        )}
        {step < 2 && (
          <Button
            secondary
            label="Şimdilik atla"
            disabled={busy}
            onPress={() => void finish(undefined, true)}
          />
        )}
      </View>
    </Sheet>
  );
}
