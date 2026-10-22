// A critical post keeps its original category; the guide reads that same post.
// Country-specific placement never changes the official document requirements.
export const spainDocumentTopics: Record<number, string[]> = {
  1: ["passport"],
  4: ["invitation"],
  7: ["employment", "student"],
  8: ["finance", "sponsor"],
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
  if (country !== "spain")
    return "Seçtiğin ülkenin Kritik bölümünde yayınlanır.";
  const placements: Record<string, string> = {
    appointment:
      "İspanya rehberindeki Randevu adımında mor topluluk notu olarak görünür.",
    invitation:
      "İspanya rehberindeki Konaklama ve davet mektubu adımında ve Konaklama belgelerinin altında mor topluluk notu olarak görünür.",
    passport:
      "İspanya belge listesindeki Pasaport maddesinin altında mor topluluk notu olarak görünür.",
    employment:
      "İspanya belge listesindeki Çalışma veya gelir durumunu açıklayan belgelerin altında mor topluluk notu olarak görünür.",
    student:
      "İspanya belge listesindeki Çalışma veya gelir durumunu açıklayan belgelerin altında mor topluluk notu olarak görünür.",
    finance:
      "İspanya belge listesindeki Maddi durumu gösteren belgelerin altında mor topluluk notu olarak görünür.",
    sponsor:
      "İspanya belge listesindeki Maddi durumu gösteren belgelerin altında mor topluluk notu olarak görünür.",
    rejection:
      "İspanya rehberindeki Başvuru öncesi dikkat bölümünde mor topluluk notu olarak görünür.",
  };
  return (
    placements[category] ??
    "İspanya rehberindeki Başvuru Süreci bölümünde mor topluluk notu olarak görünür."
  );
}
