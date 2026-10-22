import { it, expect } from "vitest";
import { processingDays } from "../src/lib/dates";
const now = Date.parse("2026-10-22T12:00:00Z");
it("calculates real calendar days", () =>
  expect(processingDays("2026-10-01", "2026-10-08", now)).toBe(7));
it("does not invent missing dates or roll invalid dates forward", () => {
  for (const pair of [
    [null, "2026-10-01"],
    ["", "2026-10-01"],
    ["2026-02-30", "2026-03-10"],
    ["01.10.2026", "2026-10-08"],
    ["0006-01-01", "2026-10-01"],
    ["2026-10-09", "2026-10-01"],
    ["2026-10-01", "2027-01-01"],
  ])
    expect(processingDays(pair[0], pair[1], now)).toBeNull();
});
it("retains genuinely long valid durations", () =>
  expect(processingDays("2000-01-01", "2026-10-01", now)).toBeGreaterThan(
    9000,
  ));
it("handles leap days without timezone offsets", () =>
  expect(processingDays("2024-02-28", "2024-03-01", now)).toBe(2));
