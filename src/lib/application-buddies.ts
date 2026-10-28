/** Local, explicitly fictional data for the opt-in matching prototype. */
export interface BuddyPlan {
  countryId: string;
  applicationCity: string;
  destination: string;
  period: string;
  purpose: string;
  stage: string;
  visible: boolean;
}
export interface BuddyExample extends Omit<BuddyPlan, "visible"> {
  id: string;
  name: string;
  initials: string;
  color: string;
}
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
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() + offset + 1, 1),
    );
    return date.toISOString().slice(0, 7);
  });
}
export function buddyMonth(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return "Dönem seç";
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "-01T12:00:00Z"));
}
export function defaultBuddyPlan(countryId: string): BuddyPlan {
  return {
    countryId,
    applicationCity: "İstanbul",
    destination: buddyCities[countryId]?.[0] ?? "",
    period: buddyPeriods()[0],
    purpose: "Turistik",
    stage: "Randevu arıyorum",
    visible: false,
  };
}
export function buddyExamples(countryId: string): BuddyExample[] {
  const destinations = buddyCities[countryId] ?? [
    "Henüz belli değil",
    "Henüz belli değil",
    "Henüz belli değil",
  ];
  const periods = buddyPeriods();
  return [
    {
      name: "Deniz",
      initials: "D",
      color: "#9274C6",
      city: "İstanbul",
      dest: 0,
      month: 0,
      purpose: "Turistik",
      stage: "Randevu arıyorum",
    },
    {
      name: "Ece",
      initials: "E",
      color: "#4E91B6",
      city: "İstanbul",
      dest: 1,
      month: 0,
      purpose: "Turistik",
      stage: "Randevumu aldım",
    },
    {
      name: "Mert",
      initials: "M",
      color: "#B27E53",
      city: "Ankara",
      dest: 0,
      month: 0,
      purpose: "Erasmus",
      stage: "Belgeleri hazırlıyorum",
    },
    {
      name: "Selin",
      initials: "S",
      color: "#5C997D",
      city: "İstanbul",
      dest: 2,
      month: 1,
      purpose: "Turistik",
      stage: "Randevu arıyorum",
    },
    {
      name: "Bora",
      initials: "B",
      color: "#B76E85",
      city: "İzmir",
      dest: 0,
      month: 0,
      purpose: "Turistik",
      stage: "Başvurumu yaptım",
    },
    {
      name: "Duru",
      initials: "D",
      color: "#6486B7",
      city: "Ankara",
      dest: 1,
      month: 2,
      purpose: "Eğitim",
      stage: "Randevumu aldım",
    },
  ].map((person, index) => ({
    id: `example-${countryId}-${index}`,
    name: person.name,
    initials: person.initials,
    color: person.color,
    countryId,
    applicationCity: person.city,
    destination: destinations[person.dest],
    period: periods[person.month],
    purpose: person.purpose,
    stage: person.stage,
  }));
}
function normalized(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
export function sameBuddyCity(a: string, b: string) {
  return !!a.trim() && !!b.trim() && normalized(a) === normalized(b);
}
function monthNumber(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return NaN;
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month;
}
export function matchBuddies(
  people: BuddyExample[],
  plan: BuddyPlan,
  filters: { destination?: boolean; period?: boolean } = {},
) {
  return people
    .filter(
      (person) =>
        person.countryId === plan.countryId &&
        (!filters.destination ||
          sameBuddyCity(person.destination, plan.destination)) &&
        (!filters.period || person.period === plan.period),
    )
    .map((person) => {
      const samePlace = sameBuddyCity(
        person.applicationCity,
        plan.applicationCity,
      );
      const samePeriod = person.period === plan.period;
      const distance = Math.abs(
        monthNumber(person.period) - monthNumber(plan.period),
      );
      const score =
        (samePlace ? 50 : 0) +
        (samePeriod ? 50 : distance === 1 ? 20 : 0) +
        (person.purpose === plan.purpose ? 10 : 0);
      return { ...person, samePlace, samePeriod, score };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
