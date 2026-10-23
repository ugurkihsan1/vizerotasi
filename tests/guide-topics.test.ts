import { expect, it } from "vitest";
import {
  documentTopics,
  documentOptions,
  selectedDocumentPlacement,
} from "../src/lib/guide-topics";
it("routes insurance only to insurance, even if legacy broad aliases are supplied", () => {
  expect(documentTopics("insurance", ["finance", "sponsor"])).toEqual([
    "doc-insurance",
  ]);
  expect(documentTopics("finance", ["finance", "sponsor"])).toEqual([
    "finance",
  ]);
  expect(documentTopics("sponsor", ["finance", "sponsor"])).toEqual([
    "sponsor",
  ]);
  expect(
    documentOptions("germany").find((d) => d.id === "doc-insurance")?.name,
  ).toMatch(/sigortası/i);
  expect(selectedDocumentPlacement("germany", "doc-insurance")).toContain(
    "sigortası",
  );
});
