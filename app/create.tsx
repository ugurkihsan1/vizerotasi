import { CountryPicker } from "../src/components/CountryPicker";
import { EvidenceUpload } from "../src/components/EvidenceUpload";
import { uploadEvidence, type EvidenceDraft } from "../src/lib/evidence";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  type FieldPath,
} from "react-hook-form";
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
  travelPurposes,
} from "../src/lib/schemas";
import {
  styles,
  colors,
  Button,
  Field,
  Chip,
  Empty,
  Message,
  Sheet,
} from "../src/components/ui";
import { DateInput } from "../src/components/DateInput";
import type { Kind } from "../src/lib/types";
import {
  criticalTipPlacement,
  guideTopicLabels,
  criticalTopics,
  documentOptions,
  selectedDocumentPlacement,
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
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [createdPost, setCreatedPost] = useState<string | null>(null);
  const uploadedEvidence = useRef(new Set<string>());
  const [uploadedUris, setUploadedUris] = useState<string[]>([]);
  const [category, setCategory] = useState(
    params.category && guideTopicLabels[params.category]
      ? params.category
      : "other",
  );
  const [categoryRoot, setCategoryRoot] = useState(
    params.category && !criticalTopics.some((t) => t.id === params.category)
      ? "documents"
      : params.category && criticalTopics.some((t) => t.id === params.category)
        ? params.category
        : "other",
  );
  const [pickDocument, setPickDocument] = useState(false);
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
  const { control, getValues, setValue, trigger, getFieldState } =
    useForm<ExperienceInput>({
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
        invitation_notes: "",
        previous_visas: [],
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
  const firstSchengen = useWatch({ control, name: "first_schengen" });
  const selectedCountry = useWatch({ control, name: "country_id" });
  const history = useFieldArray({ control, name: "previous_visas" });
  const documentChoices = documentOptions(selectedCountry);
  const placement =
    categoryRoot === "documents"
      ? selectedDocumentPlacement(selectedCountry, category)
      : criticalTipPlacement(selectedCountry, category);
  const date = (name: FieldPath<ExperienceInput>, label: string) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <DateInput
          label={label}
          value={String(value ?? "")}
          onChange={onChange}
          error={getFieldState(name).error?.message}
        />
      )}
    />
  );
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
        required:
          !(
            name.startsWith("previous_visas.") ||
            name === "invitation_notes" ||
            (kind === "experience" && name === "body")
          ) &&
          ![
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
          placeholder={
            name === "title"
              ? kind === "question"
                ? "Örn. Sigorta poliçesi için ıslak imza gerekiyor mu?"
                : kind === "tip"
                  ? "Örn. Sigorta poliçemde ıslak imza istendi"
                  : "Örn. İspanya turistik vize başvurum 20 günde sonuçlandı"
              : name === "body"
                ? kind === "tip"
                  ? "Örn. İstanbul’daki başvurumda sigorta poliçesinin ıslak imzalı nüshası istendi. Başvuru tarihim…"
                  : kind === "question"
                    ? "Örn. İlk kez başvuracağım. Seyahat tarihlerim… Merak ettiğim konu…"
                    : "Örn. Randevumu… tarihinde aldım. Evrak tesliminde… Sonucu… öğrendim."
                : name === "advice"
                  ? "Örn. Başvurmadan önce mutlaka… kontrol edin."
                  : name === "city"
                    ? "Örn. İstanbul"
                    : name === "center"
                      ? "Örn. BLS / iDATA / VFS"
                      : name === "invitation_notes"
                        ? "Örn. Davetiyem arkadaşım tarafından hazırlanıyor; henüz elime ulaşmadı."
                        : undefined
          }
          keyboardType={numeric ? "number-pad" : "default"}
          maxLength={
            name === "invitation_notes"
              ? 2000
              : name.startsWith("previous_visas.")
                ? name.endsWith(".notes")
                  ? 500
                  : 100
                : multiline
                  ? 8000
                  : 180
          }
          error={getFieldState(name).error?.message}
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
                label={
                  name.endsWith(".entries")
                    ? ({
                        single: "Tek giriş",
                        double: "Çift giriş",
                        multi: "Çok giriş",
                      }[v] ?? v)
                    : v
                }
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
            onValueChange={(next) => {
              onChange(next);
              if (name === "first_schengen" && next) history.replace([]);
            }}
          />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    />
  );
  const countryPicker = (
    <Controller
      control={control}
      name="country_id"
      render={({ field: { value, onChange } }) => (
        <CountryPicker
          value={value}
          disabled={!!createdPost}
          onChange={(id) => {
            onChange(id);
            if (categoryRoot === "documents") setCategory("documents");
          }}
        />
      )}
    />
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
    if (
      countries.data?.find((c) => c.id === v.country_id)?.community_ready ===
      false
    ) {
      setMessage(
        "Bu ülke topluluğunda paylaşım henüz açılmadı. Şimdilik rehberini inceleyebilirsin.",
      );
      return;
    }
    setBusy(true);
    try {
      const payload =
        kind === "experience"
          ? {
              ...v,
              previous_visas: v.first_schengen ? [] : v.previous_visas,
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
      let id = createdPost;
      if (!id) {
        if (evidence.length) {
          const r = await db()
            .from("posts")
            .insert({ ...payload, kind, user_id: session.user.id })
            .select("id")
            .single();
          if (r.error) throw r.error;
          id = r.data.id as string;
          setCreatedPost(id);
        } else {
          const r = await db()
            .from("posts")
            .insert({ ...payload, kind, user_id: session.user.id });
          if (r.error) throw r.error;
        }
      }
      if (id)
        for (const file of evidence) {
          if (uploadedEvidence.current.has(file.uri)) continue;
          await uploadEvidence(file, session.user.id, id);
          uploadedEvidence.current.add(file.uri);
          setUploadedUris((current) => [...current, file.uri]);
        }
      setSuccess(true);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      void cache.invalidateQueries({ queryKey: ["feed"] });
      void cache.invalidateQueries({ queryKey: ["guide-community-tips"] });
    } catch (e) {
      setMessage(
        createdPost || uploadedEvidence.current.size
          ? "Paylaşımın kaydedildi. Bazı belgeler yüklenemedi; tekrar göndererek yüklemeyi tamamlayabilir veya belgeleri kaldırarak devam edebilirsin. " +
              friendlyError(e)
          : friendlyError(e),
      );
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
                ? `Onaylandığında toplulukta yayınlanacak. ${placement}`
                : "Onaylandığında toplulukta yayınlanacak."
          }
          action="Profilime git"
          onPress={() => router.replace("/profile")}
        />
      </View>
    );
  if (createdPost)
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Paylaşımın kaydedildi</Text>
        <Text style={styles.text}>
          Kalan belgelerin yüklemesini tamamlayabilirsin. Tekrar denemek yeni
          bir paylaşım oluşturmaz.
        </Text>
        <EvidenceUpload
          files={evidence.filter((f) => !uploadedUris.includes(f.uri))}
          existing={uploadedUris.length}
          onChange={(remaining) =>
            setEvidence([
              ...evidence.filter((f) => uploadedUris.includes(f.uri)),
              ...remaining,
            ])
          }
          disabled={busy}
        />
        <Message text={message} />
        <Button
          label="Kalan belgeleri yükle"
          disabled={busy}
          onPress={() => void submit()}
        />
        <Button
          secondary
          label="Belgeleri sonra ekle"
          disabled={busy}
          onPress={() => setSuccess(true)}
        />
      </ScrollView>
    );
  if (!kind)
    return (
      <View style={styles.content}>
        <Text style={styles.title}>Ne paylaşmak istersin?</Text>
        <Text style={styles.muted}>Paylaşımın yayın öncesi incelenir.</Text>
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
            {choices("purpose", "Seyahat amacı", travelPurposes)}
          </>
        )}
        {kind === "experience" && step === 1 && (
          <>
            {toggle("first_schengen", "İlk Schengen vizem")}
            {!firstSchengen && (
              <View style={styles.card}>
                <Text style={styles.heading}>Önceki Schengen vizelerin</Text>
                <Text style={styles.muted}>
                  İsteğe bağlı. Önceki vize deneyimini paylaş; pasaport veya
                  vize numarası yazma.
                </Text>
                {history.fields.map((entry, index) => (
                  <View
                    key={entry.id}
                    style={{
                      gap: 12,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: "#E4E9E2",
                    }}
                  >
                    <Text style={styles.pillText}>
                      {index + 1}. önceki vize
                    </Text>
                    {text(
                      `previous_visas.${index}.country`,
                      "Vizeyi veren ülke",
                    )}
                    {date(
                      `previous_visas.${index}.issue_date`,
                      "Vizenin veriliş tarihi (isteğe bağlı)",
                    )}
                    {text(
                      `previous_visas.${index}.duration`,
                      "Vize süresi (ör. 6 ay, 1 yıl) · isteğe bağlı",
                    )}
                    {choices(
                      `previous_visas.${index}.entries`,
                      "Giriş hakkı (isteğe bağlı)",
                      ["single", "double", "multi"],
                    )}
                    {text(
                      `previous_visas.${index}.notes`,
                      "Önceki vizene ilişkin not (isteğe bağlı)",
                      true,
                    )}
                    <Button
                      secondary
                      label={`${index + 1}. vizeyi kaldır`}
                      onPress={() => history.remove(index)}
                    />
                  </View>
                ))}
                {history.fields.length < 10 && (
                  <Button
                    secondary
                    label="Önceki vize ekle"
                    onPress={() =>
                      history.append({
                        country: "",
                        issue_date: "",
                        duration: "",
                        entries: "",
                        notes: "",
                      })
                    }
                  />
                )}
              </View>
            )}
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
            {text(
              "invitation_notes",
              "Davetiye durumunu açıkla (isteğe bağlı)",
              true,
            )}
          </>
        )}
        {kind === "experience" && step === 2 && (
          <>
            {date("application_date", "Başvuru tarihi")}
            {date("appointment_date", "Randevu tarihi (isteğe bağlı)")}
            {date("decision_date", "Sonuç tarihi (isteğe bağlı)")}
            {date("passport_date", "Pasaport teslim tarihi (isteğe bağlı)")}
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
                  {(kind === "tip"
                    ? criticalTopics
                    : (categories.data?.filter(
                        (c) => !c.id.startsWith("doc-"),
                      ) ?? [])
                  ).map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      active={
                        (kind === "tip" ? categoryRoot : category) === c.id
                      }
                      onPress={() => {
                        setCategoryRoot(c.id);
                        setCategory(c.id);
                      }}
                    />
                  ))}
                </View>
                {kind === "tip" && categoryRoot === "documents" && (
                  <View
                    style={{
                      gap: 8,
                      paddingLeft: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: "#DCD2ED",
                    }}
                  >
                    <Text style={styles.pillText}>Hangi belgeyle ilgili?</Text>
                    <Button
                      secondary
                      disabled={!selectedCountry}
                      label={
                        category === "documents"
                          ? "Belge türünü seç"
                          : (documentChoices.find((d) => d.id === category)
                              ?.name ?? "Belge türünü seç")
                      }
                      onPress={() => setPickDocument(true)}
                    />
                    {!selectedCountry && (
                      <Text style={styles.muted}>
                        Belge türlerini görmek için ülke seç.
                      </Text>
                    )}
                    {!!selectedCountry && (
                      <Text style={styles.muted}>
                        Bu liste{" "}
                        {countries.data?.find((c) => c.id === selectedCountry)
                          ?.name ?? "seçtiğin ülke"}{" "}
                        için mevcut belge kontrol listesinden gelir.
                      </Text>
                    )}
                    <Sheet
                      visible={pickDocument}
                      onClose={() => setPickDocument(false)}
                      title="Hangi belgeyle ilgili?"
                    >
                      <ScrollView>
                        {documentChoices.map((d) => (
                          <Pressable
                            key={d.id}
                            accessibilityRole="radio"
                            accessibilityLabel={d.name}
                            accessibilityState={{ checked: category === d.id }}
                            onPress={() => {
                              setCategory(d.id);
                              setPickDocument(false);
                            }}
                            style={{ paddingVertical: 14, minHeight: 48 }}
                          >
                            <Text style={styles.text}>
                              {d.name}
                              {category === d.id ? " ✓" : ""}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Sheet>
                  </View>
                )}
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
                          Bilginin bağlanacağı yer
                        </Text>
                        {!!value && (
                          <Text
                            style={[styles.pillText, { color: "#644A94" }]}
                          >{`${countries.data?.find((c) => c.id === value)?.name ?? "Ülke"} → Turistik Vize → ${categoryRoot === "documents" && category !== "documents" ? "Belgeler → " + (documentChoices.find((d) => d.id === category)?.name ?? "Belge seç") : (guideTopicLabels[category] ?? "Başvuru Süreci")}`}</Text>
                        )}
                        <Text style={[styles.muted, { color: "#71579D" }]}>
                          {value
                            ? placement
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
                ? "Başvuru sürecinde neler yaşadın? (isteğe bağlı)"
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
        {(kind === "tip" || (kind === "experience" && step === 3)) && (
          <EvidenceUpload
            files={evidence}
            onChange={setEvidence}
            disabled={busy}
          />
        )}
        {createdPost && !success && (
          <Text style={styles.muted}>
            Paylaşımın kaydedildi. Bu ekrandaki yeniden gönderme yalnız kalan
            belgeleri yükler; yeni bir paylaşım oluşturmaz.
          </Text>
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
