import { describe, it, expect } from "vitest";
import { buildPayloadFromValues, PAYLOAD_SECTIONS } from "../PayrollDetailsForm";
import { PAYROLL_SPEC } from "@/shared/lib/payroll/spec";

describe("buildPayloadFromValues", () => {
  it("routes every populated section to its own payload key", () => {
    const payload = buildPayloadFromValues("IN", {
      accountHolderName: "A Person",
      bankName: "Example Bank",
      accountType: "savings",
      ifsc: "hdfc0001234",
      accountNumber: "123456789012",
      pan: "abcde1234f",
      taxRegime: "new",
      hasExistingUan: "yes",
      uan: "100123456789",
    });
    expect(payload.bank?.accountNumber).toBe("123456789012");
    expect(payload.tax?.pan).toBe("ABCDE1234F");
    expect(payload.statutory?.uan).toBe("100123456789");
  });

  it("uppercases fields whose spec asks for it", () => {
    const payload = buildPayloadFromValues("IN", {
      accountHolderName: "A Person",
      bankName: "Example Bank",
      accountType: "savings",
      ifsc: "hdfc0001234",
      accountNumber: "123456789012",
    });
    expect(payload.bank?.ifsc).toBe("HDFC0001234");
  });

  it("sends hasExistingUan as a boolean, not the string yes", () => {
    expect(buildPayloadFromValues("IN", { hasExistingUan: "yes" }).statutory?.hasExistingUan).toBe(true);
    expect(buildPayloadFromValues("IN", { hasExistingUan: "no" }).statutory?.hasExistingUan).toBe(false);
  });

  it("omits an entirely blank section rather than sending an empty object", () => {
    const payload = buildPayloadFromValues("IN", {
      accountHolderName: "A Person",
      bankName: "Example Bank",
      accountType: "savings",
      ifsc: "HDFC0001234",
      accountNumber: "123456789012",
    });
    expect(payload.tax).toBeUndefined();
    expect(payload.statutory).toBeUndefined();
  });

  it("emits nothing for a section with no fields (the US I-9 block)", () => {
    const payload = buildPayloadFromValues("US", {
      accountHolderName: "Jane Doe",
      bankName: "Example Bank",
      accountType: "checking",
      routingNumber: "021000021",
      accountNumber: "12345678901",
    });
    expect(payload.statutory).toBeUndefined();
  });

  it("keeps PAYLOAD_SECTIONS in step with every fielded PAYROLL_SPEC section", () => {
    for (const country of ["US", "IN"] as const) {
      for (const section of PAYROLL_SPEC[country]) {
        if (!section.fields.length) continue;
        expect(PAYLOAD_SECTIONS, `${country}.${section.id} would be silently dropped`).toContain(section.id);
      }
    }
  });
});
