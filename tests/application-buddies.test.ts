import { expect, it } from "vitest";
import {
  buddyExamples,
  buddyPeriods,
  defaultBuddyPlan,
  matchBuddies,
  sameBuddyCity,
} from "../src/lib/application-buddies";
it("prioritizes the application city and period without forcing the same destination", () => {
  const plan = defaultBuddyPlan("germany");
  const matched = matchBuddies(buddyExamples("germany"), plan);
  expect(matched.slice(0, 2).map((person) => person.destination)).toEqual([
    "Münih",
    "Berlin",
  ]);
  expect(
    matched
      .slice(0, 2)
      .every((person) => person.samePlace && person.samePeriod),
  ).toBe(true);
  expect(plan.visible).toBe(false);
});
it("filters destinations only when requested and never mixes countries", () => {
  const plan = defaultBuddyPlan("germany");
  const people = [...buddyExamples("germany"), ...buddyExamples("spain")];
  expect(
    matchBuddies(people, plan).every(
      (person) => person.countryId === "germany",
    ),
  ).toBe(true);
  const filtered = matchBuddies(
    people,
    { ...plan, destination: "  MÜNİH " },
    { destination: true, period: true },
  );
  expect(filtered).toHaveLength(3);
  expect(
    filtered.every(
      (person) =>
        person.destination === "Münih" && person.period === plan.period,
    ),
  ).toBe(true);
  expect(
    matchBuddies(
      people,
      { ...plan, destination: "Bonn" },
      { destination: true },
    ),
  ).toHaveLength(0);
});
it("handles month/year rollover and familiar Turkish spelling without matching blank cities", () => {
  expect(buddyPeriods(new Date("2026-12-20T12:00:00Z")).slice(0, 2)).toEqual([
    "2027-01",
    "2027-02",
  ]);
  expect(sameBuddyCity("Istanbul", "İstanbul")).toBe(true);
  expect(sameBuddyCity("", "")).toBe(false);
});
