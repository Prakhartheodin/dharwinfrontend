import { describe, expect, it } from "vitest";
import {
  dedupeRecipients,
  isValidEmailAddress,
  joinRecipients,
  parseRecipientInput,
  recipientsFromHeaderString,
  validateRecipientList,
} from "@/shared/lib/email-recipient-utils";

describe("email recipient utils", () => {
  it("parses comma-separated headers with display names", () => {
    expect(recipientsFromHeaderString('Ada Lovelace <ada@x.test>, bob@x.test')).toEqual([
      "Ada Lovelace <ada@x.test>",
      "bob@x.test",
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(dedupeRecipients(["a@x.test", "A@X.test", "b@x.test"])).toEqual(["a@x.test", "b@x.test"]);
  });

  it("parses pasted lists on commas, semicolons, and whitespace", () => {
    expect(parseRecipientInput("a@x.test; b@x.test\nc@x.test")).toEqual([
      "a@x.test",
      "b@x.test",
      "c@x.test",
    ]);
    expect(parseRecipientInput("a@x.test b@x.test")).toEqual(["a@x.test", "b@x.test"]);
  });

  it("validates bare and display-name addresses", () => {
    expect(isValidEmailAddress("name@example.com")).toBe(true);
    expect(isValidEmailAddress("Name <name@example.com>")).toBe(true);
    expect(isValidEmailAddress("not-an-email")).toBe(false);
  });

  it("joins recipients for compose state", () => {
    expect(joinRecipients(["a@x.test", "b@x.test"])).toBe("a@x.test, b@x.test");
  });

  it("reports invalid entries in a list", () => {
    expect(validateRecipientList(["good@x.test", "bad"])).toEqual({
      valid: false,
      invalid: ["bad"],
    });
  });
});
