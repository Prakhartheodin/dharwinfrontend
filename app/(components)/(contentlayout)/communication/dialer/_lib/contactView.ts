import type { Contact, Phone, LinkedTo, CreateContactBody } from "@/shared/lib/api/contacts";

export type PhoneDraft = { label: "work" | "mobile" | "other"; number: string; isPrimary: boolean };
export type ContactDraft = {
  name: string; phones: PhoneDraft[]; company: string; email: string; notes: string;
  tags: string[]; favorite: boolean; doNotCall: boolean;
  source?: "manual" | "from_call" | "imported"; sourceCallId?: string | null;
};
export type DraftError = { field: string; message: string };

export function normalizedDigits(number: string): string {
  return String(number ?? "").replace(/\D/g, "");
}

export function primaryPhone(contact: Contact): string {
  const phones = contact.phones ?? [];
  return (phones.find((p) => p.isPrimary) ?? phones[0])?.number ?? "";
}

export function contactInitials(name: string): string {
  const words = String(name ?? "").trim().split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length === 0) return "#";
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

// LinkedTo carries no name — P3 renders the type only (read-only). Rename to a label helper in P4 when linking gains a name.
export function linkedType(linkedTo: LinkedTo | undefined): string | null {
  return linkedTo?.type ?? null;
}

export function blankDraft(): ContactDraft {
  return {
    name: "", phones: [{ label: "mobile", number: "", isPrimary: true }],
    company: "", email: "", notes: "", tags: [], favorite: false, doNotCall: false, source: "manual",
  };
}

export function draftFromContact(c: Contact): ContactDraft {
  const phones: PhoneDraft[] = (c.phones ?? []).map((p: Phone) => ({
    label: p.label ?? "mobile", number: p.number, isPrimary: Boolean(p.isPrimary),
  }));
  return {
    name: c.name ?? "", phones: phones.length ? phones : blankDraft().phones,
    company: c.company ?? "", email: c.email ?? "", notes: c.notes ?? "",
    tags: c.tags ?? [], favorite: Boolean(c.favorite), doNotCall: Boolean(c.doNotCall),
    source: c.source ?? "manual", sourceCallId: c.sourceCallId ?? null,
  };
}

export function draftFromCall(input: { name: string; number: string; callId: string }): ContactDraft {
  return {
    ...blankDraft(),
    name: input.name || input.number,
    phones: [{ label: "mobile", number: input.number, isPrimary: true }],
    source: "from_call", sourceCallId: input.callId,
  };
}

export function validateDraft(draft: ContactDraft): DraftError[] {
  const errors: DraftError[] = [];
  if (!draft.name.trim()) errors.push({ field: "name", message: "Name is required" });
  const phones = draft.phones ?? [];
  if (phones.length === 0 || !phones.some((p) => normalizedDigits(p.number).length >= 1)) {
    errors.push({ field: "phones", message: "At least one phone number is required" });
  } else if (phones.some((p) => normalizedDigits(p.number).length === 0)) {
    errors.push({ field: "phones", message: "Remove blank phone rows" });
  }
  return errors;
}

export function toCreateBody(draft: ContactDraft): CreateContactBody {
  const phones = (draft.phones ?? [])
    .filter((p) => normalizedDigits(p.number).length >= 1)
    .map((p) => ({ label: p.label, number: p.number.trim(), isPrimary: false }));
  const flagged = draft.phones.findIndex((p) => p.isPrimary && normalizedDigits(p.number).length >= 1);
  const primaryIdx = flagged === -1 ? 0 : Math.min(flagged, phones.length - 1);
  if (phones[primaryIdx]) phones[primaryIdx].isPrimary = true;

  const body: CreateContactBody = { name: draft.name.trim(), phones };
  const company = draft.company.trim(); if (company) body.company = company;
  const email = draft.email.trim(); if (email) body.email = email;
  const notes = draft.notes.trim(); if (notes) body.notes = notes;
  if (draft.tags.length) body.tags = draft.tags;
  if (draft.favorite) body.favorite = true;
  if (draft.doNotCall) body.doNotCall = true;
  if (draft.source && draft.source !== "manual") body.source = draft.source;
  if (draft.sourceCallId) body.sourceCallId = draft.sourceCallId;
  return body;
}

export function sortContacts(list: Contact[]): Contact[] {
  // Copy first — never mutate the API-returned array in place.
  return [...list].sort((a, b) => {
    const fav = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
    if (fav) return fav;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}
