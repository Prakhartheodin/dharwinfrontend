import { describe, expect, it } from "vitest";
import {
  validateConfirmPassword,
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
} from "../auth-validation";

describe("validateEmail", () => {
  it.each(["name@example.com", " a.b+tag@sub.example.co.in ", "x@y.io"])("accepts %s", (v) => {
    expect(validateEmail(v)).toBeNull();
  });
  it.each(["", "   ", "plain", "a@b", "a@b.c", "a b@c.com", "a@@b.com", "@b.com", "a@.com", "a@b..com"])(
    "rejects %j",
    (v) => {
      expect(validateEmail(v)).not.toBeNull();
    },
  );
});

describe("validateNewPassword (mirrors backend custom.validation password)", () => {
  it("accepts 8+ chars with a capital and a number", () => {
    expect(validateNewPassword("Secret123")).toBeNull();
  });
  it.each([
    ["", "required"],
    ["Ab1", "8 characters"],
    ["password1", "capital"],
    ["Password", "number"],
  ])("rejects %j (%s)", (v, hint) => {
    expect(validateNewPassword(v)).toMatch(new RegExp(hint));
  });
});

describe("login + confirm", () => {
  it("login only requires presence", () => {
    expect(validateLoginPassword("x")).toBeNull();
    expect(validateLoginPassword("")).not.toBeNull();
  });
  it("confirm must match", () => {
    expect(validateConfirmPassword("Secret123", "Secret123")).toBeNull();
    expect(validateConfirmPassword("Secret123", "Secret124")).toMatch(/do not match/);
    expect(validateConfirmPassword("Secret123", "")).not.toBeNull();
  });
});
