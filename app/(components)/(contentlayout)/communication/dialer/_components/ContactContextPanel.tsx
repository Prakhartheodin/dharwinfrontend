"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createContact, updateContact, deleteContact, type Contact } from "@/shared/lib/api/contacts";
import {
  blankDraft, draftFromContact, validateDraft, toCreateBody, primaryPhone, linkedType,
  normalizedDigits, type ContactDraft, type PhoneDraft, type DraftError,
} from "../_lib/contactView";

type Mode = "read" | "edit" | "create";
type Props = {
  mode: Mode;
  contact: Contact | null;
  initialDraft: ContactDraft | null;
  visibleNumbers: string[]; // normalized digits of the currently-loaded contacts (best-effort dup check)
  onCall: (number: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (c: Contact) => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

const LABEL = "mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45";
const inputCls = "w-full rounded-lg border border-defaultborder/70 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary dark:text-white";

export default function ContactContextPanel(props: Props) {
  if (props.mode === "read" && props.contact) return <ReadView {...props} contact={props.contact} />;
  return <FormView {...props} />;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4"><p className={LABEL}>{label}</p>{children}</div>;
}

function ReadView({ contact, onCall, onEdit, onDeleted, onDirtyChange }: Props & { contact: Contact }) {
  const [confirming, setConfirming] = useState(false);
  const [fav, setFav] = useState(Boolean(contact.favorite));
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setFav(Boolean(contact.favorite)); }, [contact.id, contact.favorite]);
  useEffect(() => onDirtyChange(false), [onDirtyChange]); // read is never dirty
  // Clear a pending favorite write on unmount so it can't fire after navigation.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Optimistic favorite with trailing 300ms debounce (only final state hits the API).
  const toggleFav = () => {
    const next = !fav;
    setFav(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateContact(contact.id, { favorite: next }).catch(() => setFav(!next));
    }, 300);
  };

  const doDelete = async () => {
    if (busy) return; // guard against double-submit
    setBusy(true);
    try { await deleteContact(contact.id); onDeleted(); }
    finally { setBusy(false); }
  };

  const linked = linkedType(contact.linkedTo);
  const initials = contact.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">
          {initials || <i className="ri-user-3-line text-xl" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-0 truncate text-lg font-semibold text-defaulttextcolor dark:text-white">{contact.name}</p>
          {contact.company ? <p className="mb-0 truncate text-sm text-defaulttextcolor/60 dark:text-white/50">{contact.company}</p> : null}
        </div>
        <button type="button" onClick={toggleFav} aria-label="Toggle favorite"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/[0.05] dark:hover:bg-white/10">
          <i className={fav ? "ri-star-fill text-amber-400" : "ri-star-line text-defaulttextcolor/40"} />
        </button>
      </div>

      <div className="mb-4">
        <p className={LABEL}>Phones</p>
        <div className="space-y-2">
          {(contact.phones ?? []).map((p, i) => (
            <button key={i} type="button" onClick={() => onCall(p.number)}
              className="group flex w-full items-center gap-3 rounded-xl border border-defaultborder/60 px-3 py-2.5 text-left transition-colors hover:border-emerald-600/40 hover:bg-emerald-600/[0.06] dark:border-white/10">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600"><i className="ri-phone-line" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-defaulttextcolor/45">{p.label ?? "mobile"}</span>
                <span className="block truncate font-mono text-sm text-defaulttextcolor/80 dark:text-white/70">{p.number}</span>
              </span>
              {p.isPrimary ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-primary">primary</span> : null}
              <i className="ri-phone-fill text-defaulttextcolor/0 transition-colors group-hover:text-emerald-600" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {contact.email ? <Section label="Email"><span className="text-sm">{contact.email}</span></Section> : null}
      {contact.tags?.length ? (
        <Section label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((t) => <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">{t}</span>)}
          </div>
        </Section>
      ) : null}
      {contact.notes ? <Section label="Notes"><p className="mb-0 text-sm text-defaulttextcolor/70 dark:text-white/55">{contact.notes}</p></Section> : null}
      {linked ? <Section label="Linked"><span className="text-sm capitalize">{linked}</span></Section> : null}

      <div className="mt-auto space-y-2 border-t border-defaultborder/60 pt-4 dark:border-white/10">
        <button type="button" onClick={() => onCall(primaryPhone(contact))}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg ${
            contact.doNotCall ? "bg-amber-500 shadow-amber-500/25 hover:bg-amber-600" : "bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700"}`}>
          <i className="ri-phone-line" /> Call
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-defaultborder/70 py-2.5 text-sm font-semibold text-defaulttextcolor/70">
            <i className="ri-pencil-line" /> Edit
          </button>
          <button type="button" onClick={() => setConfirming(true)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-danger/40 py-2.5 text-sm font-semibold text-danger">
            <i className="ri-delete-bin-line" /> Delete
          </button>
        </div>
        {confirming ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
            <p className="mb-2 text-defaulttextcolor/80 dark:text-white/70">Delete {contact.name}?</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => void doDelete()}
                className="flex-1 rounded-lg bg-danger py-2 text-xs font-semibold text-white disabled:opacity-60">
                Delete {contact.name}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border border-defaultborder/70 py-2 text-xs font-semibold disabled:opacity-60">Cancel</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FormView({ mode, contact, initialDraft, visibleNumbers, onCancel, onSaved, onDirtyChange }: Props) {
  const original = useMemo<ContactDraft>(
    () => (mode === "edit" && contact ? draftFromContact(contact) : initialDraft ?? blankDraft()),
    [mode, contact, initialDraft]
  );
  const [draft, setDraft] = useState<ContactDraft>(original);
  const [errors, setErrors] = useState<DraftError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (mode === "create") nameRef.current?.focus(); }, [mode]);

  // P3: JSON compare is acceptable — the draft is tiny and field order is deterministic (no reorder UI).
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(original), [draft, original]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Own numbers are excluded from the dup check only when editing — a new contact owns none yet.
  const ownDigits = useMemo(
    () => new Set(mode === "edit" ? original.phones.map((p) => normalizedDigits(p.number)) : []),
    [mode, original]
  );
  const dupWarning = useMemo(() => {
    const known = new Set(visibleNumbers);
    return draft.phones.some((p) => {
      const d = normalizedDigits(p.number);
      return d.length >= 1 && known.has(d) && !ownDigits.has(d);
    });
  }, [draft.phones, visibleNumbers, ownDigits]);

  const patch = <K extends keyof ContactDraft>(k: K, v: ContactDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setPhone = (i: number, v: Partial<PhoneDraft>) =>
    setDraft((d) => ({ ...d, phones: d.phones.map((p, j) => (j === i ? { ...p, ...v } : p)) }));
  const setPrimary = (i: number) =>
    setDraft((d) => ({ ...d, phones: d.phones.map((p, j) => ({ ...p, isPrimary: j === i })) }));
  const addPhone = () => setDraft((d) => ({ ...d, phones: [...d.phones, { label: "mobile", number: "", isPrimary: false }] }));
  const removePhone = (i: number) => setDraft((d) => ({ ...d, phones: d.phones.filter((_, j) => j !== i) }));
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !draft.tags.includes(t)) patch("tags", [...draft.tags, t]);
    setTagInput("");
  };

  const errFor = (f: string) => errors.find((e) => e.field === f)?.message;

  const save = async () => {
    const errs = validateDraft(draft);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true); setServerError(null);
    try {
      const body = toCreateBody(draft);
      const saved = mode === "create"
        ? (await createContact({ ...body, autoSuggestLink: false })).contact
        : await updateContact(contact!.id, body);
      onSaved(saved);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save contact");
    } finally { setSaving(false); }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <p className="mb-4 text-lg font-semibold text-defaulttextcolor dark:text-white">
        {mode === "create" ? "New contact" : "Edit contact"}
      </p>
      {serverError ? <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{serverError}</p> : null}

      <Field label="Name" required error={errFor("name")}>
        <input ref={nameRef} value={draft.name} onChange={(e) => patch("name", e.target.value)}
          aria-label="Name" className={inputCls} />
      </Field>

      <div className="mb-4">
        <p className={LABEL}>Phones *</p>
        {errFor("phones") ? <p className="mb-1 text-xs text-danger">{errFor("phones")}</p> : null}
        <div className="space-y-2">
          {draft.phones.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={p.label} onChange={(e) => setPhone(i, { label: e.target.value as PhoneDraft["label"] })}
                aria-label={`Phone ${i + 1} label`} className="rounded-lg border border-defaultborder/70 bg-transparent px-2 py-1.5 text-xs">
                <option value="mobile">mobile</option><option value="work">work</option><option value="other">other</option>
              </select>
              <input value={p.number} onChange={(e) => setPhone(i, { number: e.target.value })}
                aria-label={`Phone ${i + 1} number`} placeholder="Number" className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => setPrimary(i)} aria-label={`Make phone ${i + 1} primary`}
                className={`grid h-8 w-8 place-items-center rounded-lg ${p.isPrimary ? "text-primary" : "text-defaulttextcolor/30"}`}>
                <i className={p.isPrimary ? "ri-star-fill" : "ri-star-line"} />
              </button>
              {draft.phones.length > 1 ? (
                <button type="button" onClick={() => removePhone(i)} aria-label={`Remove phone ${i + 1}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-defaulttextcolor/40 hover:text-danger">
                  <i className="ri-close-line" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button type="button" onClick={addPhone} className="mt-2 text-xs font-semibold text-primary">+ Add another number</button>
        {dupWarning ? (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            This number already exists in another contact.
          </p>
        ) : null}
      </div>

      <Field label="Company"><input value={draft.company} onChange={(e) => patch("company", e.target.value)} aria-label="Company" className={inputCls} /></Field>
      <Field label="Email"><input value={draft.email} onChange={(e) => patch("email", e.target.value)} aria-label="Email" className={inputCls} /></Field>

      <div className="mb-4">
        <p className={LABEL}>Tags</p>
        <div className="mb-1 flex flex-wrap gap-1.5">
          {draft.tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
              {t}<button type="button" onClick={() => patch("tags", draft.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}><i className="ri-close-line" /></button>
            </span>
          ))}
        </div>
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Add tag, press Enter" aria-label="Add tag" className={inputCls} />
      </div>

      <Field label="Notes"><textarea value={draft.notes} onChange={(e) => patch("notes", e.target.value)} aria-label="Notes" rows={3} className={inputCls} /></Field>

      <div className="mb-4 flex gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.favorite} onChange={(e) => patch("favorite", e.target.checked)} /> Favorite</label>
      </div>

      <div className="mt-auto flex gap-2 pt-2">
        <button type="button" disabled={saving} onClick={() => void save()}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {mode === "create" ? "Create" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-defaultborder/70 py-2.5 text-sm font-semibold">Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className={LABEL}>{label}{required ? " *" : ""}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
