import { expect, it } from "vitest";
import { retainFeedOrder } from "../src/lib/feed-order";

const posts = (...ids: string[]) => ids.map((id) => ({ id }));

it("keeps the reader's position when reactions change ranking", () => {
  expect(retainFeedOrder(["a", "b", "c"], posts("c", "a", "b"), false)).toEqual(
    ["a", "b", "c"],
  );
});

it("does not insert background arrivals until the reader refreshes", () => {
  expect(retainFeedOrder(["a", "b"], posts("new", "b", "a"), false)).toEqual([
    "a",
    "b",
  ]);
  expect(retainFeedOrder([], posts("new", "b", "a"), true)).toEqual([
    "new",
    "b",
    "a",
  ]);
});

it("appends another page without moving existing cards or duplicating them", () => {
  expect(
    retainFeedOrder(["a", "b"], posts("d", "b", "c", "a", "d"), true),
  ).toEqual(["a", "b", "d", "c"]);
});

it("removes deleted or inaccessible posts", () => {
  expect(retainFeedOrder(["a", "b", "c"], posts("c", "a"), false)).toEqual([
    "a",
    "c",
  ]);
});
