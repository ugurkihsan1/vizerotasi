import { getCountryGuide } from "./country-guides";
import { spainDocuments } from "./spain";
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
};
export function criticalTipPlacement(country: string, category: string) {
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
export function documentOptions(country: string) {
  const guide = getCountryGuide(country);
  const options =
    country === "spain"
      ? spainDocuments.map((d) => ({
          id: spainDocumentTopics[d.sort_order]?.[0] ?? "documents",
          name: d.title,
        }))
      : (guide?.documents ?? []).map((d) => ({
          id: documentCategoryByKey[d.key] ?? "documents",
          name: d.title,
        }));
  if (country === "spain")
    options.push(
      { id: "doc-form", name: "Başvuru formu" },
      { id: "student", name: "Öğrenci belgesi" },
      { id: "sponsor", name: "Sponsor belgeleri" },
    );
  return [
    ...options.filter((o, i, a) => a.findIndex((x) => x.id === o.id) === i),
    { id: "documents", name: "Genel belge bilgisi" },
  ];
}
export function documentTopics(key: string, legacy: string[] = []) {
  // A known checklist item owns exactly one category; legacy broad finance/sponsor
  // aliases must not route a note beneath multiple unrelated documents.
  return documentCategoryByKey[key]
    ? [documentCategoryByKey[key]]
    : [...new Set(legacy)];
}
export function selectedDocumentPlacement(country: string, category: string) {
  const option = documentOptions(country).find((o) => o.id === category);
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
