import type { Post } from "./types";
/** Rank a fetched page, then greedily diversify without dropping or duplicating posts. */
export function rankFeed(
  posts: Post[],
  followed: string[],
  now = Date.now(),
): Post[] {
  const score = (p: Post) =>
    48 / (1 + Math.max(0, (now - Date.parse(p.created_at)) / 3600000)) +
    (followed.includes(p.country_id) ? 8 : 0) +
    Math.log2(1 + p.helpful_count) * 2 +
    Math.log2(1 + p.comment_count);
  const remaining = [...posts].sort((a, b) => score(b) - score(a));
  const result: Post[] = [];
  const seenAuthors = new Set<string>();
  while (remaining.length) {
    let best = 0;
    let bestScore = -Infinity;
    remaining.forEach((p, i) => {
      const last = result.at(-1);
      const sameCountry = last?.country_id === p.country_id;
      const sameKind = last?.kind === p.kind;
      const value =
        score(p) -
        (sameCountry ? 15 : 0) -
        (sameKind ? 10 : 0) +
        (seenAuthors.has(p.user_id) ? 0 : 3);
      if (value > bestScore) {
        best = i;
        bestScore = value;
      }
    });
    const [p] = remaining.splice(best, 1);
    result.push(p);
    seenAuthors.add(p.user_id);
  }
  return result;
}
