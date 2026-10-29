import { z } from "zod";
export const previousVisaSchema = z.object({
  country: z.string().trim().min(1, "Önceki vizenin ülkesini yaz.").max(80),
  issue_date: z.union([
    z.iso.date("Geçerli bir gün/ay/yıl tarihi gir."),
    z.literal(""),
  ]),
  duration: z.string().max(100),
  entries: z.enum(["", "single", "double", "multi"]),
  notes: z.string().max(500),
});
export type PreviousVisa = z.infer<typeof previousVisaSchema>;
export const travelPurposes = [
  "Turistik",
  "Aile ziyareti",
  "Arkadaş ziyareti",
  "İş / Ticari",
  "Eğitim",
  "Kültürel etkinlik",
  "Sportif etkinlik",
  "Konferans / Kongre",
  "Erasmus / Değişim",
  "Sağlık / Tedavi",
  "Transit",
  "Diğer",
];
export const experienceSchema = z
  .object({
    country_id: z.string().min(1, "Ülke seç."),
    title: z.string().min(5, "En az 5 karakter yaz.").max(180),
    body: z.string().max(8000),
    advice: z.string().max(4000),
    city: z.string().min(2, "Başvuru şehrini yaz."),
    center: z.string().min(2, "Başvuru merkezini yaz."),
    visa_type: z.string().min(1),
    purpose: z.string().min(1),
    first_schengen: z.boolean(),
    employment_status: z.string().min(1),
    financing: z.string().min(1),
    invitation: z.boolean(),
    invitation_notes: z.string().max(2000).default(""),
    previous_visas: z.array(previousVisaSchema).max(10).default([]),
    application_date: z.union([
      z.iso.date("Geçerli bir gün/ay/yıl tarihi gir."),
      z.literal(""),
    ]),
    processing_days: z
      .number()
      .int()
      .min(0)
      .max(36500, "Geçerli bir sonuçlanma süresi gir.")
      .nullable()
      .optional(),
    appointment_date: z.union([z.iso.date(), z.literal("")]),
    passport_date: z.union([z.iso.date(), z.literal("")]),
    decision_date: z.union([z.iso.date(), z.literal("")]),
    result: z.enum(["approved", "rejected", "waiting"]),
    requested_days: z.number().int().min(1).max(730),
    granted_days: z
      .number()
      .int()
      .min(0)
      .max(1825, "Verilen vize süresi en fazla 5 yıl olabilir."),
    entries: z.enum(["single", "double", "multi"]),
  })
  .refine(
    (x) =>
      !x.decision_date ||
      !x.application_date ||
      x.decision_date >= x.application_date,
    {
      path: ["decision_date"],
      message: "Sonuç tarihi başvurudan önce olamaz.",
    },
  );
export type ExperienceInput = z.infer<typeof experienceSchema>;
export const shortPostSchema = z.object({
  country_id: z.string().min(1, "Ülke seç."),
  title: z.string().min(5, "Başlık en az 5 karakter olmalı.").max(180),
  body: z.string().min(20, "En az 20 karakter yaz.").max(8000),
  category_id: z.string().min(1),
});
export const signupSchema = z.object({
  display_name: z.string().min(2).max(60),
  username: z.string().regex(/^[a-z0-9_]{3,24}$/),
  email: z.email(),
  password: z.string().min(8),
  terms: z.literal(true),
  privacy: z.literal(true),
  transfer: z.literal(true),
});
export const privacyWarning =
  "Pasaport, T.C. kimlik, telefon, açık adres veya banka hesap bilgilerini paylaşma.";
