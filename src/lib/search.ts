import type { Country } from "./types";
export function searchWords(text: string): string[] {
  return [
    ...new Set(
      (text.slice(0, 240).match(/[\p{L}\p{N}]+/gu) ?? []).map((x) =>
        x.toLocaleLowerCase("tr"),
      ),
    ),
  ].slice(0, 20);
}
function fold(text: string) {
  return text
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i");
}
export function resolveSearch(text: string, countries: Country[]) {
  const words = searchWords(text),
    normalized = words.map(fold);
  const used = new Set<string>();
  const countryIds = countries
    .filter((country) => {
      const name = searchWords(country.name).map(fold);
      if (name.length && name.every((w) => normalized.includes(w))) {
        name.forEach((w) => used.add(w));
        return true;
      }
      if (
        normalized.length === 1 &&
        normalized[0].length >= 2 &&
        fold(country.name).includes(normalized[0])
      ) {
        used.add(normalized[0]);
        return true;
      }
      const code = fold(country.code);
      if (code.length === 2 && normalized.includes(code)) {
        used.add(code);
        return true;
      }
      return false;
    })
    .map((c) => c.id);
  return { countryIds, terms: words.filter((w) => !used.has(fold(w))) };
}
/** Only letter/number tokens reach PostgREST's filter grammar; punctuation cannot add clauses. */
export function containsAllWords(
  text: string,
  columns = ["title", "body"],
  topics: Record<string, string> = {},
): string | null {
  const words = searchWords(text);
  if (!words.length) return null;
  return `and(${words
    .map((word) => {
      const conditions = columns.map((column) => `${column}.ilike.%${word}%`);
      const categories = Object.entries(topics)
        .filter(
          ([id, label]) =>
            /^[a-z][a-z0-9-]*$/.test(id) && fold(label).includes(fold(word)),
        )
        .map(([id]) => id);
      if (categories.length)
        conditions.push(`category_id.in.(${categories.join(",")})`);
      return `or(${conditions.join(",")})`;
    })
    .join(",")})`;
}
