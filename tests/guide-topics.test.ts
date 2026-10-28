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
    documentOptions("germany").find((d) =>
      d.legacyCategories.includes("doc-insurance"),
    )?.name,
  ).toMatch(/sigortası/i);
  expect(selectedDocumentPlacement("germany", "doc-insurance")).toContain(
    "sigortası",
  );
});

it("offers exactly the rendered country documents without synthetic Spain extras", () => {
  const options = documentOptions("spain");
  expect(options).toHaveLength(13);
  expect(
    options.some(
      (d) =>
        d.name === "Genel belge bilgisi" ||
        d.name === "Öğrenci belgesi" ||
        d.name === "Sponsor belgeleri" ||
        d.name === "Başvuru formu",
    ),
  ).toBe(false);
  expect(documentOptions("")).toEqual([]);
  const custom = {
    id: "custom-document",
    country_id: "germany",
    title: "Konsolosluğun eklediği belge",
    body: "Requirement",
    category: "Temel Belgeler",
    source_url: null,
  };
  const merged = documentOptions("germany", [
    custom,
    { ...custom, id: "other-country", country_id: "france" },
  ]);
  expect(merged.find((d) => d.documentId === custom.id)?.name).toBe(
    custom.title,
  );
  expect(merged.some((d) => d.documentId === "other-country")).toBe(false);
  expect(new Set(merged.map((d) => d.id)).size).toBe(merged.length);
});
