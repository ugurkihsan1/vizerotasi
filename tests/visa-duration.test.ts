import { describe, expect, it } from "vitest";
import { formatVisaDuration, visaDurationDays } from "../src/lib/visa-duration";

describe("visa validity duration", () => {
  it("keeps all units compatible with the existing stored day count", () => {
    expect(visaDurationDays("3", "years")).toBe(1095);
    expect(visaDurationDays("6", "months")).toBe(180);
    expect(visaDurationDays("15", "days")).toBe(15);
    expect(visaDurationDays("", "years")).toBe(0);
  });
  it("formats old and new posts without rounding away extra days", () => {
    expect(formatVisaDuration(1095)).toBe("3 yıl");
    expect(formatVisaDuration(1825)).toBe("5 yıl");
    expect(formatVisaDuration(180)).toBe("6 ay");
    expect(formatVisaDuration(90)).toBe("3 ay");
    expect(formatVisaDuration(91)).toBe("91 gün");
    expect(formatVisaDuration(0)).toBe("0 gün");
  });
});
