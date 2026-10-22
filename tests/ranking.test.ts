import { it, expect } from "vitest";
import { rankFeed } from "../src/lib/ranking";
import type { Post } from "../src/lib/types";
const make = (id: string, country: string, kind: string) =>
  ({
    id,
    country_id: country,
    kind,
    user_id: id,
    helpful_count: 0,
    comment_count: 0,
    created_at: "2026-10-22T10:00:00Z",
  }) as Post;
it("diversifies tied content and preserves all identities", () => {
  const items = [
    make("a", "estonia", "experience"),
    make("b", "estonia", "experience"),
    make("c", "france", "question"),
  ];
  const result = rankFeed(items, [], Date.parse("2026-10-22T10:00:00Z"));
  expect(result.map((x) => x.id)).toEqual(["a", "c", "b"]);
  expect(items.map((x) => x.id)).toEqual(["a", "b", "c"]);
});
it("prioritizes followed countries for otherwise equal posts", () => {
  expect(
    rankFeed(
      [make("a", "france", "question"), make("b", "estonia", "experience")],
      ["estonia"],
    )[0].id,
  ).toBe("b");
});
