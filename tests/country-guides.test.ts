import { it, expect } from "vitest";
import {
  countryGuides,
  mergeCountries,
  mergeCountryDocuments,
} from "../src/lib/country-guides";
it("ships source-linked Turkish checklists for every other application country and Norway", () => {
  expect(countryGuides.map((c) => c.id).sort()).toEqual(
    [
      "belgium",
      "denmark",
      "germany",
      "estonia",
      "poland",
      "france",
      "italy",
      "greece",
      "hungary",
      "netherlands",
      "norway",
    ].sort(),
  );
  const ids = new Set<string>();
  for (const c of countryGuides) {
    expect(c.documents).toHaveLength(13);
    expect(c.appointment.length).toBeGreaterThan(50);
    for (const d of c.documents) {
      expect(d.country_id).toBe(c.id);
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
      expect(d.source_updated_at).toBeNull();
      expect(d.source_checked_at).toBe(
        c.id === "belgium"
          ? "2026-10-30"
          : c.id === "denmark"
            ? "2026-10-27"
            : "2026-10-22",
      );
      expect(c.sources.some((s) => s.url === d.source_url)).toBe(true);
      expect(new URL(d.source_url).protocol).toBe("https:");
      expect(d.body.length).toBeGreaterThan(40);
    }
  }
});
it("preserves administrator edits and distinguishes guide availability from a provisioned community", () => {
  const rows = mergeCountries([
    { id: "norway", name: "Norveç", code: "NO", flag: "🇳🇴" },
  ]);
  expect(rows.find((c) => c.id === "norway")?.community_ready).toBe(true);
  expect(rows.find((c) => c.id === "germany")?.community_ready).toBe(false);
  const original = countryGuides.find((c) => c.id === "norway")!.documents[0];
  const merged = mergeCountryDocuments("norway", [
    { ...original, body: "Administrator updated this requirement." },
  ]);
  expect(merged.find((d) => d.id === original.id)?.body).toBe(
    "Administrator updated this requirement.",
  );
});
