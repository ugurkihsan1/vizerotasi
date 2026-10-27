import { it, expect } from "vitest";
import {
  spainDocuments,
  spainGuide,
  spainSource,
  sectionsFor,
  mergeSpainDocuments,
} from "../src/lib/spain";
it("retains all thirteen source items and separate residence documents", () => {
  expect(spainDocuments.map((d) => d.sort_order)).toEqual(
    Array.from({ length: 13 }, (_, i) => i + 1),
  );
  expect(spainDocuments[9].title).toBe("Tarihçeli yerleşim yeri belgesi");
  expect(spainDocuments[10].title).toBe("İkametgâh belgesi");
});
it("keeps every employment category and does not hide unrelated requirements", () => {
  const d = spainDocuments[6];
  expect(sectionsFor(d, "employee")[0].items).toHaveLength(7);
  expect(sectionsFor(d, "owner")[0].items).toHaveLength(6);
  expect(sectionsFor(d, "retired")[0].items).toHaveLength(1);
  expect(sectionsFor(d, "student")[0].items.join(" ")).toContain(
    "öğrenci belgesi",
  );
  expect(sectionsFor(d, "unemployed")[0].items.join(" ")).toContain(
    "anne, baba veya eş",
  );
  expect(sectionsFor(d, "")).toHaveLength(4);
  expect(spainDocuments).toHaveLength(13);
});
it("distinguishes recommendations from mandatory amounts and preserves minors conditions", () => {
  const bank = spainDocuments[7];
  expect(
    bank.details.find((s) => s.requirement === "recommended")?.items.join(" "),
  ).toContain("kesin bir asgari zorunluluk değildir");
  expect(spainDocuments[11].details.flatMap((s) => s.items).join(" ")).toMatch(
    /apostil/,
  );
  expect(
    spainDocuments[11].details.flatMap((s) => s.items).join(" "),
  ).toContain("Formül C");
  expect(spainSource.published_at).toBeNull();
  expect(spainSource.verified_at).toBeNull();
});
it("uses CMS edits without changing other source records", () => {
  const modified = {
    ...spainDocuments[0],
    body: "An administrator updated the content.",
  };
  const result = mergeSpainDocuments([modified]);
  expect(result[0].body).toBe(modified.body);
  expect(result[1]).toEqual(spainDocuments[1]);
});

it("separates the current BLS appointment announcement from the undated document PDF", () => {
  const update = spainGuide.appointment_update;
  expect(update.booking_url).toBe(
    "https://turkey.blsspainglobal.com/Global/account/login",
  );
  expect(update.sources.map((s) => s.url)).toEqual([
    "https://turkey.blsspainvisa.com/istanbul/",
    "https://turkey.blsspainvisa.com/ankara/",
  ]);
  const content = update.notes.map((n) => n.body).join(" ");
  expect(content).toContain("1’i ve 16’sında");
  expect(content).toContain("09.00");
  expect(content).toContain("15 iş günü");
  expect(content).toContain("20 iş günü");
  expect(content).toContain("18 yaş ve üzerindeki");
  expect(update.notes.find((n) => n.title.includes("Ankara"))?.body).toContain(
    "yüz canlılık",
  );
  expect(spainGuide.process.join(" ")).not.toContain(
    "Her başvuru sahibi için ayrı randevu",
  );
  expect(spainSource.verified_at).toBeNull();
});
