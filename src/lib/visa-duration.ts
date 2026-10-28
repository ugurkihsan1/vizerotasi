export const visaDurationUnits = [
  { id: "days", label: "Gün", days: 1 },
  { id: "months", label: "Ay", days: 30 },
  { id: "years", label: "Yıl", days: 365 },
] as const;
export type VisaDurationUnit = (typeof visaDurationUnits)[number]["id"];
export function visaDurationDays(amount: string, unit: VisaDurationUnit) {
  return (
    Number(amount) * visaDurationUnits.find((item) => item.id === unit)!.days
  );
}
export function formatVisaDuration(days: number) {
  if (days > 0 && days % 365 === 0) return `${days / 365} yıl`;
  if (days > 0 && days % 30 === 0) return `${days / 30} ay`;
  return `${days} gün`;
}
