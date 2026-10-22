import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useForm, Controller, type FieldPath } from "react-hook-form";
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { db, configured } from "../src/lib/supabase";
import { useAuth } from "../src/lib/auth";
import { useCountries, friendlyError } from "../src/lib/data";
import {
  experienceSchema,
  shortPostSchema,
  privacyWarning,
  type ExperienceInput,
} from "../src/lib/schemas";
import {
  styles,
  colors,
  Button,
  Field,
  Chip,
  Empty,
  Message,
} from "../src/components/ui";
import type { Kind } from "../src/lib/types";
import {
  criticalTipPlacement,
  guideTopicLabels,
} from "../src/lib/guide-topics";
export default function Create() {
  const params = useLocalSearchParams<{
    kind?: string;
    country?: string;
    title?: string;
    category?: string;
  }>();
  const [kind, setKind] = useState<Kind | null>(
    params.kind === "question" || params.kind === "tip" ? params.kind : null,
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [category, setCategory] = useState(
    params.category && guideTopicLabels[params.category]
      ? params.category
      : "other",
  );
  const cache = useQueryClient();
  const { session } = useAuth();
  const countries = useCountries();
  const categories = useQuery({
    queryKey: ["categories"],
    enabled: configured,
    queryFn: async () => {
      const r = await db().from("forum_categories").select("*");
      if (r.error) throw r.error;
      return r.data as { id: string; name: string }[];
    },
  });
  const {
    control,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ExperienceInput>({
    defaultValues: {
      country_id: params.country ?? "",
      title: params.title ?? "",
      body: "",
      advice: "",
      city: "",
      center: "",
      visa_type: "C",
      purpose: "Turistik",
      first_schengen: true,
      employment_status: "Çalışan",
      financing: "Kendim",
      invitation: false,
      application_date: "",
      appointment_date: "",
      passport_date: "",
      decision_date: "",
      result: "waiting",
      requested_days: 7,
      granted_days: 0,
      entries: "single",
    },
  });
  const text = (
    name: FieldPath<ExperienceInput>,
    label: string,
    multiline = false,
    numeric = false,
  ) => (
    <Controller
      key={name}
      control={control}
      name={name}
      rules={{
        required: ![
          "advice",
          "appointment_date",
          "passport_date",
          "decision_date",
        ].includes(name),
      }}
      render={({ field: { value, onChange } }) => (
        <Field
          label={label}
          value={String(value ?? "")}
          onChangeText={(x) => onChange(numeric ? Number(x) : x)}
          multiline={multiline}
          keyboardType={numeric ? "number-pad" : "default"}
          maxLength={multiline ? 8000 : 180}
          error={errors[name]?.message}
        />
      )}
    />
  );
  const choices = (
    name: FieldPath<ExperienceInput>,
    label: string,
    values: string[],
  ) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={{ gap: 8 }}>
          <Text style={styles.muted}>{label}</Text>
          <View style={styles.row}>
            {values.map((v) => (
              <Chip
                key={v}
                label={v}
                active={value === v}
                onPress={() => onChange(v)}
              />
            ))}
          </View>
        </View>
      )}
    />
  );
  const toggle = (name: "first_schengen" | "invitation", label: string) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={styles.row}>
          <Switch
            accessibilityLabel={label}
            value={value}
            onValueChange={onChange}
          />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    />
  );
  const countryPicker = (
    <View style={{ gap: 10 }}>
      <Text style={styles.muted}>Başvuru ülkesi</Text>
      <Controller
        control={control}
        name="country_id"
        render={({ field: { value, onChange } }) => (
          <View style={styles.row}>
            {countries.data?.map((c) => (
              <Chip
                key={c.id}
                active={value === c.id}
                label={`${c.flag} ${c.name}`}
                onPress={() => onChange(c.id)}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
  async function submit() {
    setMessage("");
    const v = getValues();
    const parsed =
      kind === "experience"
        ? experienceSchema.safeParse(v)
        : shortPostSchema.safeParse({ ...v, category_id: category });
    if (!parsed.success) {
      setMessage(parsed.error.issues.map((x) => x.message).join("\n"));
      return;
    }
    if (!session) return;
    setBusy(true);
    try {
      const payload =
        kind === "experience"
          ? {
              ...v,
              appointment_date: v.appointment_date || null,
              passport_date: v.passport_date || null,
              decision_date: v.decision_date || null,
              granted_days: v.result === "approved" ? v.granted_days : null,
              entries: v.result === "approved" ? v.entries : null,
            }
          : {
              country_id: v.country_id,
              title: v.title,
              body: v.body,
              category_id: category,
            };
      const r = await db()
        .from("posts")
        .insert({ ...payload, kind, user_id: session.user.id });
      if (r.error) throw r.error;
      setSuccess(true);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      void cache.invalidateQueries({ queryKey: ["feed"] });
      void cache.invalidateQueries({ queryKey: ["guide-community-tips"] });
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <View style={styles.content}>
        <Empty
          title="Deneyimin birine yol göstersin"
          body="Paylaşım yapmak için topluluğa katıl."
          action="Giriş yap / Üye ol"
          onPress={() => router.push("/auth")}
        />
      </View>
    );
  if (success)
    return (
      <View style={styles.content}>
        <Empty
          title="Gönderin incelemeye alındı 🎉"
          body={
            kind === "experience"
              ? "Onaylandığında toplulukta yayınlanacak ve +8 katkı puanı kazanacaksın."
              : kind === "tip"
                ? `Onaylandığında toplulukta yayınlanacak. ${criticalTipPlacement(getValues("country_id"), category)}`
                : "Onaylandığında toplulukta yayınlanacak."
          }
          action="Profilime git"
          onPress={() => router.replace("/profile")}
        />
      </View>
    );
  if (!kind)
    return (
      <View style={styles.content}>
        <Text style={styles.title}>Senin deneyimin, birinin ilk adımı.</Text>
        <Text style={styles.muted}>
          Paylaşmak istediğin içerikle başla. Yayın öncesinde her gönderi
          incelenir.
        </Text>
        {(
          [
            ["experience", "✦ Vize deneyimi paylaş"],
            ["question", "? Soru sor"],
            ["tip", "⚡ Kritik bilgi paylaş"],
          ] as const
        ).map(([k, l]) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={l}
            onPress={() => setKind(k)}
            style={[
              styles.card,
              { flexDirection: "row", alignItems: "center", padding: 18 },
            ]}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor:
                  k === "experience"
                    ? "#E4EFE8"
                    : k === "question"
                      ? "#E6EDF4"
                      : "#FBEDD4",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={
                  k === "experience"
                    ? "paper-plane-outline"
                    : k === "question"
                      ? "chatbubble-ellipses-outline"
                      : "bulb-outline"
                }
                size={24}
                color={colors.blue}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.pillText}>
                {k === "experience"
                  ? "Vize deneyimi paylaş"
                  : k === "question"
                    ? "Soru sor"
                    : "Kritik bilgi paylaş"}
              </Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>
                {k === "experience"
                  ? "Başvurunu, sürecini ve sonucunu anlat."
                  : k === "question"
                    ? "Topluluğun deneyiminden yararlan."
                    : "İşe yarayan bir detayı paylaş."}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    );
  const steps: FieldPath<ExperienceInput>[][] = [
    ["country_id", "city", "center", "visa_type", "purpose"],
    ["employment_status", "financing"],
    ["application_date", "requested_days"],
    ["title", "body"],
  ];
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {kind === "experience"
            ? ["Başvurun", "Senin durumun", "Sonuç", "Deneyimini anlat"][step]
            : kind === "question"
              ? "Aklındaki soruyu sor"
              : "Topluluğa bir ipucu bırak"}
        </Text>
        {kind === "experience" && (
          <Text style={styles.muted}>{step + 1} / 4</Text>
        )}
        {(kind !== "experience" || step === 0) && countryPicker}
        {kind === "experience" && step === 0 && (
          <>
            {text("city", "Başvuru şehri")}
            {text("center", "Başvuru merkezi")}
            {choices("visa_type", "Vize türü", ["C", "D"])}
            {choices("purpose", "Seyahat amacı", [
              "Turistik",
              "İş",
              "Eğitim",
              "Aile / arkadaş ziyareti",
            ])}
          </>
        )}
        {kind === "experience" && step === 1 && (
          <>
            {toggle("first_schengen", "İlk Schengen başvurum")}
            {choices("employment_status", "Çalışma durumu", [
              "Çalışan",
              "Öğrenci",
              "Serbest çalışan",
              "Şirket sahibi",
              "İşsiz",
              "Emekli",
              "Diğer",
            ])}
            {choices("financing", "Finansman", [
              "Kendim",
              "Sponsor",
              "Karışık",
            ])}
            {toggle("invitation", "Davetiyem var")}
          </>
        )}
        {kind === "experience" && step === 2 && (
          <>
            {text("application_date", "Başvuru tarihi · YYYY-AA-GG")}
            {text(
              "appointment_date",
              "Randevu tarihi · YYYY-AA-GG (opsiyonel)",
            )}
            {text("decision_date", "Sonuç tarihi · YYYY-AA-GG (opsiyonel)")}
            {text(
              "passport_date",
              "Pasaport teslim tarihi · YYYY-AA-GG (opsiyonel)",
            )}
            <Controller
              control={control}
              name="result"
              render={({ field: { value, onChange } }) => (
                <View style={styles.row}>
                  {(["approved", "rejected", "waiting"] as const).map((x) => (
                    <Chip
                      key={x}
                      active={value === x}
                      label={
                        {
                          approved: "✓ Onaylandı",
                          rejected: "✕ Reddedildi",
                          waiting: "◷ Bekliyorum",
                        }[x]
                      }
                      onPress={() => onChange(x)}
                    />
                  ))}
                </View>
              )}
            />
            {text(
              "requested_days",
              "İstenen seyahat süresi (gün)",
              false,
              true,
            )}
            {text(
              "granted_days",
              "Verilen vize süresi (onaylandıysa, gün)",
              false,
              true,
            )}
            <Controller
              control={control}
              name="entries"
              render={({ field: { value, onChange } }) => (
                <View style={styles.row}>
                  {(["single", "double", "multi"] as const).map((x) => (
                    <Chip
                      key={x}
                      active={value === x}
                      label={
                        { single: "Tek", double: "Çift", multi: "Multi" }[x]
                      }
                      onPress={() => onChange(x)}
                    />
                  ))}
                </View>
              )}
            />
          </>
        )}
        {(kind !== "experience" || step === 3) && (
          <>
            <Text style={[styles.muted, { color: "#9A6615" }]}>
              {privacyWarning}
            </Text>
            {kind !== "experience" && (
              <View style={{ gap: 10 }}>
                <Text style={styles.pillText}>
                  {kind === "tip"
                    ? "Kritik bilgi hangi konuyla ilgili?"
                    : "Konu"}
                </Text>
                <View style={styles.row}>
                  {categories.data?.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      active={category === c.id}
                      onPress={() => setCategory(c.id)}
                    />
                  ))}
                </View>
                {kind === "tip" && (
                  <Controller
                    control={control}
                    name="country_id"
                    render={({ field: { value } }) => (
                      <View
                        style={{
                          padding: 12,
                          backgroundColor: "#F0EBFA",
                          borderRadius: 10,
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#644A94",
                          }}
                        >
                          Onaylandıktan sonra nerede görünecek?
                        </Text>
                        <Text style={[styles.muted, { color: "#71579D" }]}>
                          {value
                            ? criticalTipPlacement(value, category)
                            : "Ülke ve konu seç; notun ilgili başvuru adımına bağlansın."}
                        </Text>
                      </View>
                    )}
                  />
                )}
              </View>
            )}
            {text(
              "title",
              kind === "question" ? "Sorunun başlığı" : "Kısa bir başlık",
            )}
            {text(
              "body",
              kind === "experience"
                ? "Başvuru sürecinde neler yaşadın?"
                : "Detaylar",
              true,
            )}
            <Controller
              control={control}
              name="body"
              render={({ field: { value } }) => (
                <Text style={styles.muted}>{value.length} / 8000</Text>
              )}
            />
            {kind === "experience" &&
              text("advice", "Başvuracak birine özellikle ne söylersin?", true)}
          </>
        )}
        <Message text={message} />
        <View style={styles.row}>
          {step > 0 && (
            <Button label="Geri" secondary onPress={() => setStep(step - 1)} />
          )}
          {kind === "experience" && step < 3 ? (
            <Button
              label="Devam"
              onPress={() => {
                void trigger(steps[step]).then((ok) => {
                  if (!getValues("country_id")) setMessage("Ülke seç.");
                  else if (ok) {
                    setMessage("");
                    setStep(step + 1);
                  } else setMessage("Bu adımdaki alanları tamamla.");
                });
              }}
            />
          ) : (
            <Button
              label={busy ? "Gönderiliyor…" : "İncelemeye gönder"}
              disabled={busy}
              onPress={() => void submit()}
            />
          )}
        </View>
        <Button
          secondary
          label="Paylaşım türünü değiştir"
          onPress={() => {
            setKind(null);
            setStep(0);
            setValue("body", getValues("body"));
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
