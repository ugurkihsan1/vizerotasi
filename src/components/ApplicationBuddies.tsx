import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { useAuth } from "../lib/auth";
import { isDark, textSize, themeColor, useAppearance } from "../lib/appearance";
import {
  buddyCities,
  buddyExamples,
  buddyMonth,
  buddyPeriods,
  defaultBuddyPlan,
  matchBuddies,
  type BuddyExample,
  type BuddyPlan,
} from "../lib/application-buddies";
import { Button, Chip, Field, Message, Sheet, styles, colors } from "./ui";
import { HelpButton } from "./HelpButton";

export function ApplicationBuddies({
  countryId,
  countryName,
  header,
}: {
  countryId: string;
  countryName: string;
  header: ReactNode;
}) {
  useAppearance();
  const { session } = useAuth();
  const storageKey = `buddy-preview:v1:${session?.user.id ?? "guest"}:${countryId}`;
  const [plan, setPlan] = useState(() => defaultBuddyPlan(countryId));
  const [draft, setDraft] = useState(plan);
  const [editing, setEditing] = useState(false);
  const [sameDestination, setSameDestination] = useState(false);
  const [samePeriod, setSamePeriod] = useState(false);
  const [selected, setSelected] = useState<BuddyExample | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!value) return;
        const saved = JSON.parse(value) as BuddyPlan;
        if (
          mounted &&
          saved.countryId === countryId &&
          typeof saved.applicationCity === "string" &&
          typeof saved.destination === "string" &&
          buddyPeriods().includes(saved.period) &&
          typeof saved.purpose === "string" &&
          typeof saved.stage === "string" &&
          typeof saved.visible === "boolean"
        )
          setPlan(saved);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [storageKey, countryId]);
  const matches = matchBuddies(buddyExamples(countryId), plan, {
    destination: sameDestination,
    period: samePeriod,
  });
  const surface = isDark() ? "#151515" : "#F6F6F6";
  const border = themeColor("#E4E4E4", "border");
  const accent = isDark() ? "#98D4AF" : "#26704A";
  const edit = () => {
    setDraft(plan);
    setError("");
    setEditing(true);
  };
  const options = (
    label: string,
    values: string[],
    value: string,
    onChange: (value: string) => void,
  ) => (
    <View style={{ gap: 7 }}>
      <Text style={styles.muted}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7 }}
      >
        {values.map((item) => (
          <Chip
            key={item}
            label={item}
            active={value === item}
            onPress={() => onChange(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
  return (
    <>
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.content, { paddingBottom: 36, gap: 18 }]}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        <View style={{ gap: 7 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: textSize(18),
                fontWeight: "700",
              }}
            >
              Başvuru arkadaşları
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: textSize(10),
                backgroundColor: surface,
                paddingVertical: 5,
                paddingHorizontal: 9,
                borderRadius: 7,
              }}
            >
              Prototip
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 22,
            padding: 16,
            gap: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={styles.pillText}>Senin planın</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Başvuru planını düzenle"
              onPress={edit}
              hitSlop={6}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Ionicons name="create-outline" size={17} color={colors.muted} />
              <Text style={styles.muted}>Düzenle</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.muted}>Başvuru yeri</Text>
              <Text style={[styles.heading, { fontSize: textSize(18) }]}>
                {plan.applicationCity}
              </Text>
            </View>
            <Ionicons name="airplane-outline" size={24} color={colors.muted} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.muted}>Gidilecek şehir</Text>
              <Text style={[styles.heading, { fontSize: textSize(18) }]}>
                {plan.destination || countryName}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={styles.muted}>
              {buddyMonth(plan.period)} · {plan.purpose}
            </Text>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: border,
              paddingTop: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.amber,
                }}
              />
              <Text style={[styles.muted, { fontSize: textSize(12), flex: 1 }]}>
                {plan.stage}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={edit}
              accessibilityLabel={
                plan.visible
                  ? "Plan önizlemesini düzenle"
                  : "Plan önizlemesine katıl"
              }
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text
                style={{
                  fontSize: textSize(12),
                  fontWeight: "700",
                  color: plan.visible ? accent : colors.navy,
                }}
              >
                {plan.visible ? "✓ Planın hazır" : "Ben de katılayım"}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={styles.heading}>Sana yakın başvurular</Text>
            <Text style={[styles.muted, { fontSize: textSize(11) }]}>
              Örnek kişiler
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            <Chip
              label="Aynı varış şehri"
              active={sameDestination}
              onPress={() => setSameDestination(!sameDestination)}
            />
            <Chip
              label="Aynı dönem"
              active={samePeriod}
              onPress={() => setSamePeriod(!samePeriod)}
            />
            <HelpButton
              label="Başvuru arkadaşları nasıl sıralanır?"
              title="Sana yakın başvurular"
            >
              <Text style={styles.text}>
                Aynı ülke, başvuru yeri ve yakın dönem öne çıkar. Münih ve
                Berlin’e gidenler de başvuru arkadaşı olabilir.
              </Text>
              <Text style={styles.text}>
                Bu prototip örnek kişilerle çalışır. Planın bu cihazda saklanır;
                gerçek bir listeye eklenmez.
              </Text>
            </HelpButton>
          </ScrollView>
        </View>
        {matches.map((person) => (
          <View
            key={person.id}
            testID={`buddy-${person.id}`}
            style={{
              borderWidth: 1,
              borderColor: border,
              borderRadius: 20,
              padding: 14,
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: person.color + (isDark() ? "35" : "20"),
                }}
              >
                <Text
                  style={{
                    fontSize: textSize(20),
                    fontWeight: "800",
                    color: isDark() ? colors.navy : person.color,
                  }}
                >
                  {person.initials}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.pillText, { fontSize: textSize(16) }]}>
                  {person.name}
                </Text>
                <Text style={[styles.muted, { fontSize: textSize(12) }]}>
                  Başvuru: {person.applicationCity} · {person.purpose}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                flexWrap: "wrap",
              }}
            >
              <Ionicons
                name="airplane-outline"
                size={15}
                color={colors.muted}
              />
              <Text
                style={{
                  color: colors.navy,
                  fontWeight: "600",
                  fontSize: textSize(13),
                }}
              >
                {person.destination}
              </Text>
              <Text style={styles.muted}>· {buddyMonth(person.period)}</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text
                style={{
                  color:
                    person.samePlace && person.samePeriod
                      ? accent
                      : colors.muted,
                  flex: 1,
                  fontSize: textSize(11),
                }}
              >
                {person.samePlace && person.samePeriod
                  ? "Aynı başvuru yeri · Aynı dönem"
                  : person.samePlace
                    ? "Aynı başvuru yeri"
                    : person.samePeriod
                      ? "Aynı dönem"
                      : person.stage}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${person.name} ile tanışmayı dene`}
                onPress={() => {
                  setSelected(person);
                  setPreview(false);
                  setError("");
                  setText(
                    `Merhaba ${person.name}, ben de ${countryName} için başvuru hazırlığındayım. Süreçte yardımlaşalım mı?`,
                  );
                }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: isDark() ? "#E8E8E8" : "#111111",
                }}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={15}
                  color={colors.bg}
                />
                <Text
                  style={{
                    color: colors.bg,
                    fontWeight: "700",
                    fontSize: textSize(12),
                  }}
                >
                  Tanış
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
        {!matches.length && (
          <View style={{ alignItems: "center", padding: 24, gap: 10 }}>
            <Ionicons name="people-outline" size={32} color={colors.muted} />
            <Text style={styles.heading}>Bu filtrede örnek kişi yok</Text>
            <Button
              secondary
              label="Filtreleri temizle"
              onPress={() => {
                setSameDestination(false);
                setSamePeriod(false);
              }}
            />
          </View>
        )}
      </ScrollView>
      <Sheet
        visible={editing}
        title="Başvuru planın"
        onClose={() => setEditing(false)}
      >
        <Text style={[styles.muted, { fontSize: textSize(12) }]}>
          Önizleme · Yalnızca bu cihazda saklanır.
        </Text>
        {options(
          "Başvuru yeri",
          ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa"],
          draft.applicationCity,
          (applicationCity) => setDraft({ ...draft, applicationCity }),
        )}
        <Field
          label="Gidilecek şehir"
          value={draft.destination}
          maxLength={60}
          placeholder={buddyCities[countryId]?.join(", ") ?? "Şehir adı"}
          onChangeText={(destination) => setDraft({ ...draft, destination })}
        />
        {options(
          "Seyahat amacı",
          ["Turistik", "Erasmus", "Eğitim", "İş", "Aile ziyareti", "Diğer"],
          draft.purpose,
          (purpose) => setDraft({ ...draft, purpose }),
        )}
        <View style={{ gap: 7 }}>
          <Text style={styles.muted}>Başvuru dönemi</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            {buddyPeriods().map((period) => (
              <Chip
                key={period}
                label={buddyMonth(period)}
                active={draft.period === period}
                onPress={() => setDraft({ ...draft, period })}
              />
            ))}
          </ScrollView>
        </View>
        {options(
          "Şu an hangi aşamadasın?",
          [
            "Randevu arıyorum",
            "Randevumu aldım",
            "Belgeleri hazırlıyorum",
            "Başvurumu yaptım",
          ],
          draft.stage,
          (stage) => setDraft({ ...draft, stage }),
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text style={[styles.pillText, { flex: 1 }]}>
            Başvuru arkadaşlarında görün
          </Text>
          <Switch
            accessibilityLabel="Başvuru arkadaşlarında görün"
            value={draft.visible}
            onValueChange={(visible) => setDraft({ ...draft, visible })}
          />
        </View>
        <Message text={error} />
        <Button
          label="Eşleşmeleri önizle"
          onPress={() => {
            const next = { ...draft, destination: draft.destination.trim() };
            if (!next.destination) {
              setError("Gidilecek şehri yaz.");
              return;
            }
            void AsyncStorage.setItem(storageKey, JSON.stringify(next))
              .then(() => {
                setPlan(next);
                setEditing(false);
                setError("");
              })
              .catch(() => setError("Plan saklanamadı. Yeniden dene."));
          }}
        />
      </Sheet>
      <Sheet
        visible={!!selected}
        title="Tanışma önizlemesi"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <View style={{ gap: 5 }}>
              <Text style={styles.heading}>
                {selected.name} · {selected.destination}
              </Text>
              <Text style={styles.muted}>
                {selected.applicationCity} · {buddyMonth(selected.period)} ·{" "}
                {selected.purpose}
              </Text>
            </View>
            {preview ? (
              <View
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "90%",
                  borderRadius: 18,
                  borderBottomRightRadius: 4,
                  backgroundColor: surface,
                  padding: 14,
                  gap: 8,
                }}
              >
                <Text style={styles.text}>{text}</Text>
                <Text
                  style={[
                    styles.muted,
                    { fontSize: textSize(10), textAlign: "right" },
                  ]}
                >
                  Örnek mesaj · Gönderilmedi
                </Text>
              </View>
            ) : (
              <>
                <Field
                  label="Tanışma mesajın"
                  value={text}
                  onChangeText={setText}
                  maxLength={500}
                  multiline
                />
                <Message text={error} />
                <Button
                  label="Gönderimi dene"
                  onPress={() => {
                    if (text.trim().length < 2) setError("Kısa bir mesaj yaz.");
                    else setPreview(true);
                  }}
                />
              </>
            )}
            <Text style={[styles.muted, { fontSize: textSize(12) }]}>
              Örnek profil · Gerçek mesaj gönderilmez.
            </Text>
          </>
        )}
      </Sheet>
    </>
  );
}
