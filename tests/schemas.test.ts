import { describe, it, expect } from "vitest";
import {
  signupSchema,
  experienceSchema,
  shortPostSchema,
} from "../src/lib/schemas";
describe("submission validation", () => {
  it("requires explicit legal consent and a safe username", () => {
    expect(
      signupSchema.safeParse({
        display_name: "Mert",
        username: "mert",
        email: "mert@example.com",
        password: "longpassword123",
        terms: true,
        privacy: true,
      }).success,
    ).toBe(true);
    expect(
      signupSchema.safeParse({
        display_name: "Mert",
        username: "Admin!!",
        email: "mert@example.com",
        password: "short",
        terms: false,
        privacy: false,
      }).success,
    ).toBe(false);
  });
  it("rejects missing country and too-short question bodies", () => {
    expect(
      shortPostSchema.safeParse({
        country_id: "",
        title: "Soru",
        body: "Kısa",
        category_id: "other",
      }).success,
    ).toBe(false);
  });
  it("rejects invalid dates and inverted timelines", () => {
    const v = {
      country_id: "estonia",
      title: "İlk Schengen deneyimim",
      body: "Başvuru sürecindeki deneyimim.",
      advice: "",
      city: "İstanbul",
      center: "VFS",
      visa_type: "C",
      purpose: "Turistik",
      first_schengen: true,
      employment_status: "Çalışan",
      financing: "Kendim",
      invitation: false,
      application_date: "2026-10-01",
      appointment_date: "",
      passport_date: "",
      decision_date: "2026-09-01",
      result: "approved",
      requested_days: 7,
      granted_days: 15,
      entries: "single",
    };
    expect(experienceSchema.safeParse(v).success).toBe(false);
    expect(
      experienceSchema.safeParse({ ...v, decision_date: "2026-10-08" }).success,
    ).toBe(true);
  });
});
