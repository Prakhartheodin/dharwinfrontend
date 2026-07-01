import { describe, it, expect } from "vitest";
import {
  primaryPhone, contactInitials, linkedType, blankDraft, draftFromCall,
  toCreateBody, validateDraft, sortContacts, normalizedDigits, type ContactDraft,
} from "../contactView";
import type { Contact } from "@/shared/lib/api/contacts";

const c = (over: Partial<Contact> = {}): Contact => ({
  id: "1", tenantId: "t", ownerId: "o", name: "Anita",
  phones: [{ number: "+91 98765 43210", isPrimary: true }], ...over,
});

describe("contactView", () => {
  it("primaryPhone prefers isPrimary, else first, else empty", () => {
    expect(primaryPhone(c({ phones: [{ number: "A" }, { number: "B", isPrimary: true }] }))).toBe("B");
    expect(primaryPhone(c({ phones: [{ number: "A" }, { number: "B" }] }))).toBe("A");
    expect(primaryPhone(c({ phones: [] }))).toBe("");
  });

  it("contactInitials: up to 2 letters, '#' for number-only/empty", () => {
    expect(contactInitials("Anita Sharma")).toBe("AS");
    expect(contactInitials("Anita")).toBe("A");
    expect(contactInitials("+91 98765")).toBe("#");
    expect(contactInitials("")).toBe("#");
  });

  it("linkedType returns the type or null", () => {
    expect(linkedType({ type: "candidate", id: "x" } as never)).toBe("candidate");
    expect(linkedType(null)).toBe(null);
    expect(linkedType(undefined)).toBe(null);
  });

  it("validateDraft rejects empty name, no-phone, digit-less numbers", () => {
    const ok = blankDraft(); ok.name = "Bob"; ok.phones[0].number = "+91 900";
    expect(validateDraft(ok)).toEqual([]);
    expect(validateDraft({ ...ok, name: "  " }).some((e) => e.field === "name")).toBe(true);
    expect(validateDraft({ ...ok, phones: [] }).some((e) => e.field === "phones")).toBe(true);
    expect(validateDraft({ ...ok, phones: [{ label: "mobile", number: "+", isPrimary: true }] })
      .some((e) => e.field === "phones")).toBe(true);
  });

  it("toCreateBody trims, drops empties, keeps exactly one primary", () => {
    const d: ContactDraft = { ...blankDraft(), name: " Anita ", company: "", email: " a@b.co ",
      phones: [{ label: "mobile", number: " +91 1 ", isPrimary: false },
               { label: "work", number: "+91 2", isPrimary: false }] };
    const body = toCreateBody(d);
    expect(body.name).toBe("Anita");
    expect("company" in body).toBe(false);       // empty dropped
    expect(body.email).toBe("a@b.co");
    expect(body.phones.filter((p) => p.isPrimary).length).toBe(1);
    expect(body.phones[0].isPrimary).toBe(true);  // none flagged → first
  });

  it("draftFromCall prefills a from_call primary phone", () => {
    const d = draftFromCall({ name: "Jane", number: "+91 5", callId: "call1" });
    expect(d.name).toBe("Jane");
    expect(d.source).toBe("from_call");
    expect(d.sourceCallId).toBe("call1");
    expect(d.phones[0]).toMatchObject({ number: "+91 5", isPrimary: true });
  });

  it("sortContacts: favorites first, then name asc", () => {
    const list = [c({ id: "1", name: "Sara" }), c({ id: "2", name: "Anil", favorite: true }),
                  c({ id: "3", name: "Bob" })];
    expect(sortContacts(list).map((x) => x.id)).toEqual(["2", "3", "1"]);
  });

  it("normalizedDigits strips non-digits", () => {
    expect(normalizedDigits("+91 98765-43210")).toBe("919876543210");
  });
});
