"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listContacts, type Contact } from "@/shared/lib/api/contacts";
import { buildContactParams, useDebouncedValue, type ContactListView } from "../_lib/contactSearch";
import { sortContacts, primaryPhone } from "../_lib/contactView";
import ContactCard from "./ContactCard";

type Props = {
  view: ContactListView;
  selectedContactId: string | null;
  refreshKey: number;
  onSelectContact: (c: Contact) => void;
  onDialContact: (number: string) => void;
  onEditContact: (c: Contact) => void;
  onNewContact: () => void;
  onLoaded: (contacts: Contact[]) => void;
};

export default function ContactsList({
  view, selectedContactId, refreshKey, onSelectContact, onDialContact, onEditContact, onNewContact, onLoaded,
}: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const reqId = useRef(0); // guards against out-of-order search responses

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true); setError(null); setForbidden(false);
    try {
      const res = await listContacts(buildContactParams(view, debouncedQuery));
      if (id !== reqId.current) return; // a newer request superseded this one
      const sorted = sortContacts(res.results || []);
      setContacts(sorted);
      onLoaded(sorted);
    } catch (e) {
      if (id !== reqId.current) return;
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) setForbidden(true);
      else setError(e instanceof Error ? e.message : "Failed to load contacts");
    } finally { if (id === reqId.current) setLoading(false); }
  }, [view, debouncedQuery, onLoaded]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const emptyCopy = useMemo(() => (view === "favorites" ? "No favorites yet" : "No contacts yet"), [view]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-defaultborder/70 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20">
          <i className="ri-search-line text-defaulttextcolor/40" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts" aria-label="Search contacts"
            className="w-full min-w-0 bg-transparent text-sm focus:outline-none dark:text-white" />
        </div>
        <button type="button" onClick={onNewContact} aria-label="New contact"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white hover:bg-primary/90">
          <i className="ri-add-line" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-black/[0.06] dark:bg-white/10" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-black/[0.05] dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : forbidden ? (
          <p className="px-2 py-8 text-center text-sm text-defaulttextcolor/45">
            You don&rsquo;t have permission to view contacts.
          </p>
        ) : error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-3 text-xs text-danger">
            {error}{" "}
            <button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button>
          </div>
        ) : contacts.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-defaulttextcolor/45">{emptyCopy}</p>
        ) : (
          <div className="space-y-1">
            {contacts.map((c) => (
              <ContactCard key={c.id} contact={c} selected={selectedContactId === c.id}
                onSelect={() => onSelectContact(c)} onDial={() => onDialContact(primaryPhone(c))}
                onEdit={() => onEditContact(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
