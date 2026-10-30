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
        transfer: true,
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

it("accepts eight-character signup passwords but rejects seven characters", () => {
  const values = {
    display_name: "Ayşe",
    username: "ayse",
    email: "ayse@example.com",
    password: "Abc12345",
    transfer: true,
    terms: true,
    privacy: true,
  };
  expect(signupSchema.safeParse(values).success).toBe(true);
  expect(
    signupSchema.safeParse({ ...values, password: "Abc1234" }).success,
  ).toBe(false);
});
it("allows an empty experience narrative and bounded optional visa history", () => {
  const values = {
    country_id: "germany",
    title: "Kültürel etkinlik deneyimim",
    body: "",
    advice: "",
    city: "İstanbul",
    center: "iData",
    visa_type: "C",
    purpose: "Kültürel etkinlik",
    first_schengen: false,
    employment_status: "Öğrenci",
    financing: "Sponsor",
    invitation: true,
    invitation_notes: "Etkinlik düzenleyicisinin davetiyesi vardı.",
    previous_visas: [
      {
        country: "Fransa",
        issue_date: "2024-07-01",
        duration: "6 ay",
        entries: "multi",
        notes: "Sorunsuz kullandım.",
      },
    ],
    application_date: "2026-10-01",
    appointment_date: "",
    passport_date: "",
    decision_date: "2026-10-20",
    result: "approved",
    requested_days: 9,
    granted_days: 30,
    entries: "multi",
  };
  expect(experienceSchema.safeParse(values).success).toBe(true);
  expect(
    experienceSchema.safeParse({
      ...values,
      previous_visas: [
        { ...values.previous_visas[0], issue_date: "2024-02-30" },
      ],
    }).success,
  ).toBe(false);
  expect(
    experienceSchema.safeParse({
      ...values,
      previous_visas: Array(11).fill(values.previous_visas[0]),
    }).success,
  ).toBe(false);
  expect(
    shortPostSchema.safeParse({
      country_id: "germany",
      title: "Soru başlığım",
      body: "",
      category_id: "documents",
    }).success,
  ).toBe(false);
});
