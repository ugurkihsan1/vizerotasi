import { expect, it } from "vitest";
import {
  buddyPeriods,
  buddyMonth,
  defaultBuddyPlan,
  buddyPlanError,
  buddyPlanFromRow,
} from "../src/lib/application-buddies";
it("never assumes a user's application or destination city", () => {
  const plan = defaultBuddyPlan("germany");
  expect(plan.applicationCity).toBe("");
  expect(plan.destination).toBe("");
  expect(buddyPlanError(plan)).toBe("Başvuru yerini yaz.");
});
it("validates the application period and accepts actual database plans", () => {
  const plan = buddyPlanFromRow({
    user_id: "member",
    country_id: "germany",
    application_city: "İstanbul",
    destination_city: "Berlin",
    application_month: buddyPeriods()[0] + "-01",
    purpose: "Kültürel etkinlik",
    stage: "documents",
  });
  expect(buddyPlanError(plan)).toBe("");
  expect(buddyPlanError({ ...plan, period: "2000-01" })).toBe(
    "Başvuru dönemini güncelle.",
  );
  expect(buddyPlanError({ ...plan, destination: " " })).toBe(
    "Gidilecek şehri yaz.",
  );
  expect(buddyPlanError({ ...plan, purpose: "Unrecognized" })).toBe(
    "Amaç ve aşama seç.",
  );
});
it("includes the current month and handles year rollover without guessing exact dates", () => {
  expect(buddyPeriods(new Date("2026-12-20T12:00:00Z")).slice(0, 2)).toEqual([
    "2026-12",
    "2027-01",
  ]);
  expect(buddyMonth("2026-11-01")).toBe("Kasım 2026");
  expect(buddyMonth("2026-99")).toBe("Dönem seç");
});
