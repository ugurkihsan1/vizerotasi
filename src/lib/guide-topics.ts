import type { Document } from "./types";
import {
  getCountryGuide,
  mergeCountryDocuments,
  countryGuides,
} from "./country-guides";
import { mergeSpainDocuments } from "./spain";
// A critical post keeps its original category; the guide reads that same post.
// Country-specific placement never changes the official document requirements.
export const spainDocumentTopics: Record<number, string[]> = {
  1: ["passport"],
  2: ["doc-photo"],
  3: ["doc-itinerary"],
  4: ["invitation"],
  5: ["doc-insurance"],
  6: ["doc-purpose"],
  7: ["employment", "student"],
  8: ["finance", "sponsor"],
  9: ["doc-registry"],
  10: ["doc-residence-history"],
  11: ["doc-residence"],
  12: ["doc-minors"],
  13: ["doc-copies"],
};
export const guideTopicLabels: Record<string, string> = {
  appointment: "Randevu",
  invitation: "Davet mektubu",
  documents: "Belgeler",
  finance: "Finansal durum",
  student: "Öğrenci",
  employment: "Çalışan",
  sponsor: "Sponsor",
  rejection: "Ret",
  passport: "Pasaport",
  other: "Diğer",
  "visa-fee": "Vize ücreti",
};
export function criticalTipPlacement(country: string, category: string) {
  if (category === "visa-fee")
    return `${getCountryGuide(country)?.name ?? (country === "spain" ? "İspanya" : "Seçtiğin ülke")} → Belgeler → Vize ücreti bölümünde topluluk notu olarak görünür.`;
  if (country !== "spain") {
    const guide = getCountryGuide(country);
    if (!guide) return "Seçtiğin ülkenin Önemli bilgi bölümünde yayınlanır.";
    if (category === "appointment")
      return `${guide.name} rehberindeki Randevu adımında topluluk notu olarak görünür.`;
    if (category === "invitation")
      return `${guide.name} rehberindeki Konaklama ve davet mektubu bölümünde ve ilgili belgenin altında topluluk notu olarak görünür.`;
    if (category === "rejection")
      return `${guide.name} rehberindeki Ret ve yeniden başvuru bölümünde topluluk notu olarak görünür.`;
    if (
      category === "documents" ||
      category === "other" ||
      category === "doc-form"
    )
      return `${guide.name} rehberindeki Başvuru Süreci bölümünde topluluk notu olarak görünür.`;
    return selectedDocumentPlacement(country, category);
  }
  const placements: Record<string, string> = {
    appointment:
      "İspanya rehberindeki Randevu adımında topluluk notu olarak görünür.",
    invitation:
      "İspanya rehberindeki Konaklama ve davet mektubu adımında ve Konaklama belgelerinin altında topluluk notu olarak görünür.",
    passport:
      "İspanya belge listesindeki Pasaport maddesinin altında topluluk notu olarak görünür.",
    employment:
      "İspanya belge listesindeki Çalışma veya gelir durumunu açıklayan belgelerin altında topluluk notu olarak görünür.",
    student:
      "İspanya belge listesindeki Çalışma veya gelir durumunu açıklayan belgelerin altında topluluk notu olarak görünür.",
    finance:
      "İspanya belge listesindeki Maddi durumu gösteren belgelerin altında topluluk notu olarak görünür.",
    sponsor:
      "İspanya belge listesindeki Maddi durumu gösteren belgelerin altında topluluk notu olarak görünür.",
    rejection:
      "İspanya rehberindeki Başvuru öncesi dikkat bölümünde topluluk notu olarak görünür.",
  };
  return (
    placements[category] ??
    "İspanya rehberindeki Başvuru Süreci bölümünde topluluk notu olarak görünür."
  );
}

export const criticalTopics = [
  { id: "appointment", name: "Randevu" },
  { id: "documents", name: "Belgeler" },
  { id: "visa-fee", name: "Vize ücreti" },
  { id: "invitation", name: "Davet mektubu" },
  { id: "rejection", name: "Ret / İtiraz" },
  { id: "other", name: "Diğer" },
];
export const documentCategoryByKey: Record<string, string> = {
  passport: "passport",
  form: "doc-form",
  photo: "doc-photo",
  insurance: "doc-insurance",
  itinerary: "doc-itinerary",
  accommodation: "invitation",
  finance: "finance",
  employment: "employment",
  student: "student",
  registry: "doc-registry",
  sponsor: "sponsor",
  minors: "doc-minors",
  residence: "doc-residence",
};
export const newDocumentCategories = [
  { id: "doc-form", name: "Başvuru formu" },
  { id: "doc-photo", name: "Biyometrik fotoğraf" },
  { id: "doc-insurance", name: "Seyahat sağlık sigortası" },
  { id: "doc-itinerary", name: "Ulaşım / Seyahat planı" },
  { id: "doc-purpose", name: "Seyahat amacı / Niyet dilekçesi" },
  { id: "doc-registry", name: "Nüfus kayıt örneği" },
  { id: "doc-residence-history", name: "Tarihçeli yerleşim yeri" },
  { id: "doc-residence", name: "İkamet belgesi" },
  { id: "doc-minors", name: "18 yaş altı / Muvafakatname" },
  { id: "doc-copies", name: "Pasaport ve kimlik fotokopileri" },
];
Object.assign(
  guideTopicLabels,
  Object.fromEntries(newDocumentCategories.map((x) => [x.id, x.name])),
);
export const documentTopicId = (id: string) => `document-${id}`;
export function countryDocumentList(country: string, rows: Document[] = []) {
  const ownRows = rows.filter((row) => row.country_id === country);
  return country === "spain"
    ? mergeSpainDocuments(ownRows)
    : mergeCountryDocuments(country, ownRows);
}
export function documentOptions(country: string, rows: Document[] = []) {
  if (!country) return [];
  return countryDocumentList(country, rows).map((doc) => {
    const metadata = doc as Document & {
      key?: string;
      topic_ids?: string[];
      sort_order?: number;
    };
    const legacyCategories =
      country === "spain"
        ? (spainDocumentTopics[metadata.sort_order ?? 0] ?? [])
        : documentTopics(metadata.key ?? "", metadata.topic_ids ?? []);
    return {
      id: documentTopicId(doc.id),
      documentId: doc.id,
      name: doc.title,
      legacyCategories,
    };
  });
}
// One previously published Spain fee note was explicitly filed as a form note.
// Keep its original live post visible in the right place until the SQL correction is applied.
export const legacySpainFeePost = "0542061e-8117-444f-9c79-2d7755095dd4";
export function documentTopics(
  key: string,
  legacy: string[] = [],
  documentId?: string,
) {
  // A known checklist item owns exactly one category; legacy broad finance/sponsor
  // aliases must not route a note beneath multiple unrelated documents.
  const topics = documentCategoryByKey[key]
    ? [documentCategoryByKey[key]]
    : legacy;
  return [
    ...new Set([
      ...(documentId ? [documentTopicId(documentId)] : []),
      ...topics,
    ]),
  ];
}
export function selectedDocumentPlacement(
  country: string,
  category: string,
  rows: Document[] = [],
) {
  const option = documentOptions(country, rows).find(
    (o) => o.id === category || o.legacyCategories.includes(category),
  );
  if (!option || category === "documents")
    return country === "spain"
      ? "İspanya rehberindeki Başvuru Süreci bölümünde topluluk notu olarak görünür."
      : `${getCountryGuide(country)?.name ?? "Seçtiğin ülke"} rehberindeki Başvuru Süreci bölümünde topluluk notu olarak görünür.`;
  if (category === "doc-form" && country === "spain")
    return `${getCountryGuide(country)?.name ?? "İspanya"} rehberindeki Başvuru Süreci bölümünde topluluk notu olarak görünür.`;
  const label =
    getCountryGuide(country)?.name ??
    (country === "spain" ? "İspanya" : "Seçtiğin ülke");
  return `${label} belge listesindeki “${option.name}” maddesinde topluluk notu olarak görünür.`;
}

// Keep category-aware search working for notes linked to exact checklist items.
for (const country of ["spain", ...countryGuides.map((guide) => guide.id)]) {
  for (const option of documentOptions(country))
    guideTopicLabels[option.id] = option.name;
}
