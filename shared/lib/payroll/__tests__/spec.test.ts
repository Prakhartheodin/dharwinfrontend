import { describe, it, expect } from "vitest";
import { PAYROLL_SPEC, validateField, allFields, BOOLEAN_FIELDS } from "../spec";

describe("payroll spec", () => {
  it("covers both supported countries", () => {
    expect(Object.keys(PAYROLL_SPEC).sort()).toEqual(["IN", "US"]);
  });

  it("gives every field a visible label — no placeholder-only inputs", () => {
    for (const country of ["US", "IN"] as const) {
      for (const field of allFields(country)) {
        expect(field.label, `${country}.${field.id} needs a label`).toBeTruthy();
      }
    }
  });

  it("uses unique field ids within a country", () => {
    for (const country of ["US", "IN"] as const) {
      const ids = allFields(country).map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("asks the US for a routing number and India for an IFSC, never both", () => {
    const usIds = allFields("US").map((f) => f.id);
    const inIds = allFields("IN").map((f) => f.id);
    expect(usIds).toContain("routingNumber");
    expect(usIds).not.toContain("ifsc");
    expect(inIds).toContain("ifsc");
    expect(inIds).not.toContain("routingNumber");
  });

  it("marks the account number sensitive in both countries", () => {
    for (const country of ["US", "IN"] as const) {
      expect(allFields(country).find((f) => f.id === "accountNumber")?.sensitive).toBe(true);
    }
  });

  it("rejects a required field left empty", () => {
    const field = allFields("US").find((f) => f.id === "routingNumber")!;
    expect(validateField(field, "")).toMatch(/required/i);
  });

  it("rejects a routing number that is not nine digits, with a usable message", () => {
    const field = allFields("US").find((f) => f.id === "routingNumber")!;
    const message = validateField(field, "12345678");
    expect(message).toBeTruthy();
    expect(message).toMatch(/9 digits/);
  });

  it("accepts a valid routing number", () => {
    const field = allFields("US").find((f) => f.id === "routingNumber")!;
    expect(validateField(field, "021000021")).toBeNull();
  });

  it("accepts a valid IFSC and rejects one with a non-zero fifth character", () => {
    const field = allFields("IN").find((f) => f.id === "ifsc")!;
    expect(validateField(field, "HDFC0001234")).toBeNull();
    expect(validateField(field, "HDFC1001234")).toBeTruthy();
  });

  it("uppercases IFSC before matching, so lowercase input is accepted", () => {
    const field = allFields("IN").find((f) => f.id === "ifsc")!;
    expect(validateField(field, "hdfc0001234")).toBeNull();
  });

  it("allows an optional field to be empty", () => {
    const field = allFields("IN").find((f) => f.id === "branchName")!;
    expect(field.required).toBe(false);
    expect(validateField(field, "")).toBeNull();
  });

  it("gives each country a tax section", () => {
    expect(PAYROLL_SPEC.US.some((s) => s.id === "tax")).toBe(true);
    expect(PAYROLL_SPEC.IN.some((s) => s.id === "tax")).toBe(true);
  });

  it("asks the US for SSN status and India for PAN, never crossed", () => {
    const usIds = allFields("US").map((f) => f.id);
    const inIds = allFields("IN").map((f) => f.id);
    expect(usIds).toContain("ssnStatus");
    expect(usIds).not.toContain("pan");
    expect(inIds).toContain("pan");
    expect(inIds).not.toContain("ssnStatus");
  });

  it("does not mark the SSN itself required — pending SSNs are normal on OPT/CPT", () => {
    expect(allFields("US").find((f) => f.id === "ssn")?.required).toBe(false);
  });

  it("marks SSN and PAN sensitive", () => {
    expect(allFields("US").find((f) => f.id === "ssn")?.sensitive).toBe(true);
    expect(allFields("IN").find((f) => f.id === "pan")?.sensitive).toBe(true);
  });

  it("validates PAN format", () => {
    const pan = allFields("IN").find((f) => f.id === "pan")!;
    expect(validateField(pan, "ABCDE1234F")).toBeNull();
    expect(validateField(pan, "ABCD11234F")).toBeTruthy();
  });

  it("accepts an SSN with or without dashes", () => {
    const ssn = allFields("US").find((f) => f.id === "ssn")!;
    expect(validateField(ssn, "123456789")).toBeNull();
    expect(validateField(ssn, "123-45-6789")).toBeNull();
    expect(validateField(ssn, "1234")).toBeTruthy();
  });

  it("gives India a statutory section and the US an I-9 note section", () => {
    expect(PAYROLL_SPEC.IN.some((s) => s.id === "statutory")).toBe(true);
    expect(PAYROLL_SPEC.US.some((s) => s.id === "statutory")).toBe(true);
  });

  it("never marks Aadhaar required — a private employer cannot compel it", () => {
    const aadhaar = allFields("IN").find((f) => f.id === "aadhaar");
    expect(aadhaar?.required).toBe(false);
    expect(aadhaar?.help).toMatch(/EPF|UAN/i);
  });

  it("marks Aadhaar and UAN sensitive", () => {
    expect(allFields("IN").find((f) => f.id === "aadhaar")?.sensitive).toBe(true);
    expect(allFields("IN").find((f) => f.id === "uan")?.sensitive).toBe(true);
  });

  it("does not put derived PF or ESI applicability in the form", () => {
    const ids = allFields("IN").map((f) => f.id);
    expect(ids).not.toContain("pfApplicable");
    expect(ids).not.toContain("esiApplicable");
  });

  it("validates Aadhaar and UAN formats", () => {
    const aadhaar = allFields("IN").find((f) => f.id === "aadhaar")!;
    expect(validateField(aadhaar, "234567890123")).toBeNull();
    expect(validateField(aadhaar, "134567890123")).toBeTruthy();
    const uan = allFields("IN").find((f) => f.id === "uan")!;
    expect(validateField(uan, "100123456789")).toBeNull();
    expect(validateField(uan, "10012345678")).toBeTruthy();
  });

  it("sends hasExistingUan as a boolean", () => {
    expect(BOOLEAN_FIELDS.has("hasExistingUan")).toBe(true);
  });
});
