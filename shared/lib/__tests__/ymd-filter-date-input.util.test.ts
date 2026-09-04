import { describe, expect, it } from "vitest";
import { parseYmdLocal } from "@/shared/lib/leave-date-range";
import {
  sanitizeReferralLeadsDateInput,
  isValidYmdLocal,
  maskDmyInput,
  describeDmyProblem,
  isReferralLeadsDateRangeInvalid,
  getReferralLeadsDateRangeError,
  REFERRAL_LEADS_INVALID_DATE_RANGE_MESSAGE,
} from "@/shared/lib/ymd-filter-date-input.util";

describe("describeDmyProblem", () => {
  it("says nothing while the entry is still plausible", () => {
    expect(describeDmyProblem("")).toBeNull();
    expect(describeDmyProblem("3")).toBeNull();
    expect(describeDmyProblem("31")).toBeNull();
    expect(describeDmyProblem("31/12")).toBeNull();
    expect(describeDmyProblem("31/12/2026")).toBeNull();
  });

  it("rejects a day no month can have", () => {
    expect(describeDmyProblem("35")).toContain("31");
    expect(describeDmyProblem("99/")).toContain("31");
    expect(describeDmyProblem("00")).toContain("01");
  });

  it("rejects an impossible month", () => {
    expect(describeDmyProblem("10/13")).toContain("12");
    expect(describeDmyProblem("10/00")).toContain("01");
  });

  it("names the month that is too short, as soon as the month is typed", () => {
    expect(describeDmyProblem("31/04")).toBe("April has only 30 days.");
    expect(describeDmyProblem("31/06")).toBe("June has only 30 days.");
    expect(describeDmyProblem("31/09")).toBe("September has only 30 days.");
    expect(describeDmyProblem("31/11")).toBe("November has only 30 days.");
  });

  it("holds February at 29 until the year decides it", () => {
    // 29/02 may still be valid -- do not reject it before the year is known.
    expect(describeDmyProblem("29/02")).toBeNull();
    expect(describeDmyProblem("30/02")).toBe("February has at most 29 days.");
    expect(describeDmyProblem("31/02")).toBe("February has at most 29 days.");
  });

  it("resolves February against the leap year once the year is complete", () => {
    expect(describeDmyProblem("29/02/2024")).toBeNull();
    expect(describeDmyProblem("29/02/2000")).toBeNull();
    expect(describeDmyProblem("29/02/2025")).toBe("February 2025 has only 28 days.");
    expect(describeDmyProblem("29/02/1900")).toBe("February 1900 has only 28 days.");
  });

  it("reports the day before the month when both are wrong", () => {
    expect(describeDmyProblem("45/13")).toContain("31");
  });
});

describe("maskDmyInput", () => {
  it("adds the separator as soon as the day and the month are complete", () => {
    expect(maskDmyInput("2")).toBe("2");
    expect(maskDmyInput("25")).toBe("25/");
    expect(maskDmyInput("250")).toBe("25/0");
    expect(maskDmyInput("2505")).toBe("25/05/");
    expect(maskDmyInput("25052")).toBe("25/05/2");
    expect(maskDmyInput("25052026")).toBe("25/05/2026");
  });

  it("keeps an already separated value stable and ignores junk", () => {
    expect(maskDmyInput("25/05/2026")).toBe("25/05/2026");
    expect(maskDmyInput("2a5b")).toBe("25/");
    expect(maskDmyInput("")).toBe("");
  });

  it("lets a trailing separator be deleted instead of springing back", () => {
    // "25/" backspaced to "25" must stay "25", or the slash is undeletable.
    expect(maskDmyInput("25", "25/")).toBe("25");
    expect(maskDmyInput("25/05", "25/05/")).toBe("25/05");
  });

  it("never grows past dd/mm/yyyy", () => {
    expect(maskDmyInput("250520261")).toBe("25/05/2026");
  });
});

describe("isValidYmdLocal", () => {
  it("accepts real calendar dates with a 4-digit year", () => {
    expect(isValidYmdLocal("2026-01-15")).toBe(true);
    expect(isValidYmdLocal(" 1999-12-31 ")).toBe(true);
  });

  it("rejects impossible month/day combinations", () => {
    expect(isValidYmdLocal("2026-02-31")).toBe(false);
    expect(isValidYmdLocal("2026-13-01")).toBe(false);
    expect(isValidYmdLocal("2026-00-15")).toBe(false);
    expect(isValidYmdLocal("2026-04-31")).toBe(false);
  });

  it("rejects non-4-digit years", () => {
    expect(isValidYmdLocal("55555-01-01")).toBe(false);
    expect(isValidYmdLocal("26-01-01")).toBe(false);
  });
});

describe("sanitizeReferralLeadsDateInput", () => {
  it("returns empty string when cleared", () => {
    expect(sanitizeReferralLeadsDateInput("")).toBe("");
    expect(sanitizeReferralLeadsDateInput("   ")).toBe("");
  });

  it("accepts valid YYYY-MM-DD with a 4-digit year", () => {
    expect(sanitizeReferralLeadsDateInput("2026-01-15")).toBe("2026-01-15");
    expect(sanitizeReferralLeadsDateInput(" 1999-12-31 ")).toBe("1999-12-31");
  });

  it("rejects years with more than 4 digits", () => {
    expect(sanitizeReferralLeadsDateInput("55555-01-01")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("123456-06-30")).toBeNull();
  });

  it("rejects years with fewer than 4 digits", () => {
    expect(sanitizeReferralLeadsDateInput("26-01-01")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("202-01-01")).toBeNull();
  });

  it("rejects malformed date strings", () => {
    expect(sanitizeReferralLeadsDateInput("not-a-date")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("2026/01/01")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("2026-1-01")).toBeNull();
  });

  it("rejects invalid month/day values", () => {
    expect(sanitizeReferralLeadsDateInput("2026-02-31")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("2026-13-10")).toBeNull();
  });

  it("accepts the dd/mm/yyyy the field now displays and returns YYYY-MM-DD", () => {
    expect(sanitizeReferralLeadsDateInput("15/01/2026")).toBe("2026-01-15");
    expect(sanitizeReferralLeadsDateInput(" 31/12/1999 ")).toBe("1999-12-31");
  });

  it("rejects impossible dd/mm/yyyy dates", () => {
    expect(sanitizeReferralLeadsDateInput("31/02/2026")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("10/13/2026")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("1/1/2026")).toBeNull();
    expect(sanitizeReferralLeadsDateInput("15/01/20265")).toBeNull();
  });

  it("aligns with parseYmdLocal acceptance rules", () => {
    const valid = "2026-06-15";
    expect(sanitizeReferralLeadsDateInput(valid)).toBe(valid);
    expect(parseYmdLocal(valid)).not.toBeNull();

    const invalid = "55555-06-15";
    expect(sanitizeReferralLeadsDateInput(invalid)).toBeNull();
    expect(parseYmdLocal(invalid)).toBeNull();
  });
});

describe("referral leads date range validation", () => {
  it("accepts empty or single-sided ranges", () => {
    expect(isReferralLeadsDateRangeInvalid("", "")).toBe(false);
    expect(isReferralLeadsDateRangeInvalid("2026-01-01", "")).toBe(false);
    expect(isReferralLeadsDateRangeInvalid("", "2026-01-31")).toBe(false);
    expect(getReferralLeadsDateRangeError("2026-01-01", "")).toBeNull();
    expect(getReferralLeadsDateRangeError("", "2026-01-31")).toBeNull();
    expect(isReferralLeadsDateRangeInvalid(undefined, undefined)).toBe(false);
    expect(getReferralLeadsDateRangeError(undefined, "2026-01-31")).toBeNull();
    expect(getReferralLeadsDateRangeError("2026-01-01", null)).toBeNull();
  });

  it("accepts From on or before To", () => {
    expect(isReferralLeadsDateRangeInvalid("2026-01-01", "2026-01-31")).toBe(false);
    expect(isReferralLeadsDateRangeInvalid("2026-01-15", "2026-01-15")).toBe(false);
    expect(getReferralLeadsDateRangeError("2026-01-01", "2026-01-31")).toBeNull();
  });

  it("rejects From after To with a clear message", () => {
    expect(isReferralLeadsDateRangeInvalid("2026-02-01", "2026-01-31")).toBe(true);
    expect(getReferralLeadsDateRangeError("2026-02-01", "2026-01-31")).toBe(
      REFERRAL_LEADS_INVALID_DATE_RANGE_MESSAGE
    );
  });
});
