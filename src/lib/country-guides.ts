import content from "../content/country-guides.json";
import type { Country, Document } from "./types";
export type CountryGuide = (typeof content)[number];
export type OfficialDocument = CountryGuide["documents"][number];
export const countryGuides = content;
export function getCountryGuide(id: string) {
  return content.find((c) => c.id === id);
}
export function mergeCountries(rows: Country[]): Country[] {
  const countries = new Map(
    rows.map((c) => [c.id, { ...c, community_ready: true }]),
  );
  for (const c of content)
    if (!countries.has(c.id))
      countries.set(c.id, {
        id: c.id,
        name: c.name,
        code: c.code,
        flag: c.flag,
        community_ready: false,
      });
  return [...countries.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "tr"),
  );
}
export function mergeCountryDocuments(
  id: string,
  rows: Document[],
): Document[] {
  const guide = getCountryGuide(id);
  if (!guide) return rows;
  const base = new Map(guide.documents.map((d) => [d.id, d]));
  for (const row of rows)
    base.set(row.id, { ...base.get(row.id), ...row } as OfficialDocument);
  return [...base.values()];
}
