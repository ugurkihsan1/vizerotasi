import { travelPurposes } from "./schemas";
export { travelPurposes as buddyPurposes };
export const buddyStages = {
  appointment_search: "Randevu arıyorum",
  appointment_booked: "Randevumu aldım",
  documents: "Belgeleri hazırlıyorum",
  submitted: "Başvurumu yaptım",
};
export type BuddyStage = keyof typeof buddyStages;
export interface BuddyPlan {
  countryId: string;
  applicationCity: string;
  destination: string;
  period: string;
  purpose: string;
  stage: BuddyStage;
}
export interface BuddyPlanRow {
  user_id: string;
  country_id: string;
  application_city: string;
  destination_city: string;
  application_month: string;
  purpose: string;
  stage: BuddyStage;
}
export interface ApplicationBuddy extends BuddyPlanRow {
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_count: number;
}
export interface BuddyFilters {
  city: string;
  destination: string;
  period: string;
}
export const emptyBuddyFilters: BuddyFilters = {
  city: "",
  destination: "",
  period: "",
};
export const buddyCities: Record<string, string[]> = {
  germany: ["Münih", "Berlin", "Hamburg"],
  spain: ["Barselona", "Madrid", "Valensiya"],
  estonia: ["Tallinn", "Tartu", "Pärnu"],
  france: ["Paris", "Lyon", "Nice"],
  italy: ["Roma", "Milano", "Floransa"],
  greece: ["Atina", "Selanik", "Rodos"],
  poland: ["Varşova", "Krakov", "Gdańsk"],
  hungary: ["Budapeşte", "Debrecen", "Szeged"],
  netherlands: ["Amsterdam", "Rotterdam", "Utrecht"],
  norway: ["Oslo", "Bergen", "Trondheim"],
  denmark: ["Kopenhag", "Aarhus", "Odense"],
};

export function buddyPeriods(now = new Date()): string[] {
  return Array.from({ length: 13 }, (_, offset) =>
    new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1))
      .toISOString()
      .slice(0, 7),
  );
}
export function buddyMonth(value: string): string {
  const period = value.slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return "Dönem seç";
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(period + "-01T12:00:00Z"));
}
export function defaultBuddyPlan(countryId: string): BuddyPlan {
  return {
    countryId,
    applicationCity: "",
    destination: "",
    period: buddyPeriods()[0],
    purpose: "Turistik",
    stage: "appointment_search",
  };
}
export function buddyPlanFromRow(row: BuddyPlanRow): BuddyPlan {
  return {
    countryId: row.country_id,
    applicationCity: row.application_city,
    destination: row.destination_city,
    period: row.application_month.slice(0, 7),
    purpose: row.purpose,
    stage: row.stage,
  };
}
export function buddyPlanError(plan: BuddyPlan): string {
  if (
    plan.applicationCity.trim().length < 2 ||
    plan.applicationCity.trim().length > 80
  )
    return "Başvuru yerini yaz.";
  if (plan.destination.trim().length < 2 || plan.destination.trim().length > 80)
    return "Gidilecek şehri yaz.";
  if (!buddyPeriods().includes(plan.period))
    return "Başvuru dönemini güncelle.";
  if (
    !travelPurposes.includes(plan.purpose) ||
    !Object.hasOwn(buddyStages, plan.stage)
  )
    return "Amaç ve aşama seç.";
  return "";
}
export function buddyUnavailable(error: unknown): boolean {
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(
    (error as { code?: string })?.code ?? "",
  );
}
