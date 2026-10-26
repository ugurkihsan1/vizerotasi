import { expect, it } from "vitest";
import { containsAllWords, resolveSearch } from "../src/lib/search";
const countries = [
  { id: "germany", name: "Almanya", code: "DE", flag: "🇩🇪" },
  { id: "spain", name: "İspanya", code: "ES", flag: "🇪🇸" },
  { id: "france", name: "Fransa", code: "FR", flag: "🇫🇷" },
];
it("recognizes countries separately from the subject, including country-only and combined searches", () => {
  expect(resolveSearch("Almanya sigorta", countries)).toEqual({
    countryIds: ["germany"],
    terms: ["sigorta"],
  });
  expect(resolveSearch("sigorta", countries)).toEqual({
    countryIds: [],
    terms: ["sigorta"],
  });
  expect(resolveSearch("Almanya", countries)).toEqual({
    countryIds: ["germany"],
    terms: [],
  });
  expect(resolveSearch("Almanya Fransa sigorta", countries)).toEqual({
    countryIds: ["germany", "france"],
    terms: ["sigorta"],
  });
});
it("handles country prefixes, codes and Turkish spelling without accents", () => {
  expect(resolveSearch("alm", countries).countryIds).toEqual(["germany"]);
  expect(resolveSearch("ispanya", countries).countryIds).toEqual(["spain"]);
  expect(resolveSearch("DE sigorta", countries)).toEqual({
    countryIds: ["germany"],
    terms: ["sigorta"],
  });
});
it("matches all terms against titles or bodies using substring filters", () => {
  expect(containsAllWords("sigorta ıslak")).toBe(
    "and(or(title.ilike.%sigorta%,body.ilike.%sigorta%),or(title.ilike.%ıslak%,body.ilike.%ıslak%))",
  );
  expect(containsAllWords('%,_\\"),status.eq.approved')).not.toContain(
    "status.eq.",
  );
  expect(containsAllWords(" %_ ")).toBeNull();
});
it("finds a critical topic even when the author uses different wording in the title", () => {
  const filter = containsAllWords("sigorta imza", ["title", "body"], {
    "doc-insurance": "Seyahat sağlık sigortası",
    finance: "Finansal durum",
  });
  expect(filter).toContain("category_id.in.(doc-insurance)");
  expect(filter).not.toContain("category_id.in.(finance)");
  expect(filter).toContain("or(title.ilike.%imza%,body.ilike.%imza%)");
});
