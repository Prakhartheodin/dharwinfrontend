"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Dialpad from "@/app/(components)/(contentlayout)/communication/calling/_components/Dialpad";
import DialerRail, { type View } from "./DialerRail";
import CallContextPanel from "./CallContextPanel";
import ContactContextPanel from "./ContactContextPanel";
import { callId, callName, callNumber } from "../_lib/recentCalls";
import { draftFromCall, blankDraft, normalizedDigits, type ContactDraft } from "../_lib/contactView";
import type { CallRecord } from "@/shared/lib/api/bolna";
import type { Contact } from "@/shared/lib/api/contacts";

type MobileTab = "recent" | "dialer" | "context";
type ContactMode = "read" | "edit" | "create";

export default function DialerWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("recent");
  const [missed, setMissed] = useState(0);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(searchParams.get("call"));
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactMode, setContactMode] = useState<ContactMode | null>(null);
  const [createDraft, setCreateDraft] = useState<ContactDraft | null>(null);
  const [dialTarget, setDialTarget] = useState<string | undefined>();
  // Bumped by a "Call" CTA to tell the Dialpad to place the call (not just prefill).
  const [dialNowToken, setDialNowToken] = useState(0);
  const dialNow = useCallback((n: string) => {
    setDialTarget(n); setDialNowToken((t) => t + 1); setMobileTab("dialer");
  }, []);
  const [mobileTab, setMobileTab] = useState<MobileTab>("dialer");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedContacts, setLoadedContacts] = useState<Contact[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const syncCallUrl = useCallback((id: string | null) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (id) params.set("call", id); else params.delete("call");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Any action that would abandon a dirty form is deferred behind a confirm.
  const guard = useCallback((action: () => void) => {
    if (dirty) setPending(() => action); else action();
  }, [dirty]);

  const showContactPane = selectedContact != null || contactMode === "create";

  const selectCall = useCallback((r: CallRecord) => guard(() => {
    setSelectedContact(null); setContactMode(null); setCreateDraft(null);
    setSelectedCall(r); setSelectedCallId(callId(r)); setDialTarget(callNumber(r));
    syncCallUrl(callId(r)); setMobileTab("context");
  }), [guard, syncCallUrl]);

  const selectContact = useCallback((c: Contact) => guard(() => {
    setSelectedCall(null); setSelectedCallId(null); syncCallUrl(null);
    setSelectedContact(c); setContactMode("read"); setCreateDraft(null); setMobileTab("context");
  }), [guard, syncCallUrl]);

  const changeView = useCallback((v: View) => guard(() => setView(v)), [guard]);

  const newContact = useCallback(() => guard(() => {
    setSelectedCall(null); setSelectedCallId(null); syncCallUrl(null);
    setSelectedContact(null); setCreateDraft(blankDraft()); setContactMode("create"); setMobileTab("context");
  }), [guard, syncCallUrl]);

  const saveAsContact = useCallback((r: CallRecord) => guard(() => {
    setSelectedCall(null); setSelectedContact(null);
    setCreateDraft(draftFromCall({ name: callName(r), number: callNumber(r), callId: callId(r) }));
    setContactMode("create"); setMobileTab("context");
  }), [guard]);

  const editContact = useCallback((c: Contact) => guard(() => {
    setSelectedCall(null); setSelectedContact(c); setContactMode("edit"); setMobileTab("context");
  }), [guard]);

  const clearSelection = useCallback(() => {
    setSelectedCall(null); setSelectedCallId(null); setSelectedContact(null);
    setContactMode(null); setCreateDraft(null); syncCallUrl(null); setDirty(false);
  }, [syncCallUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "Escape" && !dirty) clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection, dirty]);

  const visibleNumbers = useMemo(
    () => loadedContacts.flatMap((c) => (c.phones ?? []).map((p) => normalizedDigits(p.number))),
    [loadedContacts]
  );

  const afterSaved = (c: Contact) => {
    setDirty(false); setRefreshKey((k) => k + 1);
    setView("contacts"); setContactMode("read"); setCreateDraft(null); setSelectedContact(c);
  };
  const afterDeleted = () => { setDirty(false); setRefreshKey((k) => k + 1); clearSelection(); };

  const runPending = () => { const p = pending; setPending(null); setDirty(false); p?.(); };

  return (
    <div className="h-[calc(100dvh-9rem)]">
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-defaultborder/70 p-1 lg:hidden">
        {(["recent", "dialer", "context"] as MobileTab[]).map((t) => (
          <button key={t} type="button" onClick={() => setMobileTab(t)}
            className={`rounded-md py-1.5 text-xs font-semibold capitalize ${mobileTab === t ? "bg-primary text-white" : "text-defaulttextcolor/70"}`}>
            {t === "context" ? "Details" : t}
          </button>
        ))}
      </div>

      <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[clamp(280px,20vw,360px)_minmax(0,1fr)] xl:grid-cols-[clamp(280px,20vw,360px)_minmax(560px,820px)_340px]">
        <div className={`min-h-0 overflow-hidden rounded-2xl border border-defaultborder/70 bg-white dark:bg-black/10 ${mobileTab === "recent" ? "block" : "hidden"} lg:block`}>
          <DialerRail view={view} missedCount={missed} onViewChange={changeView}
            selectedCallId={selectedCallId} selectedContactId={selectedContact?.id ?? null}
            refreshKey={refreshKey} searchRef={searchRef}
            onSelectCall={selectCall} onDialCall={(r) => { setDialTarget(callNumber(r)); setMobileTab("dialer"); }}
            onMissedCount={setMissed} onSelectContact={selectContact}
            onDialContact={(n) => { setDialTarget(n); setMobileTab("dialer"); }}
            onEditContact={editContact} onNewContact={newContact} onLoaded={setLoadedContacts} />
        </div>

        <div className={`min-h-0 overflow-y-auto rounded-2xl border border-defaultborder/70 bg-white p-4 dark:bg-black/10 ${mobileTab === "dialer" ? "block" : "hidden"} lg:block`}>
          <Dialpad dialTarget={dialTarget} dialNowToken={dialNowToken} />
        </div>

        <div className={`sticky top-0 min-h-0 overflow-y-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-black/10 ${mobileTab === "context" ? "block" : "hidden"} lg:hidden xl:block`}>
          {pending ? (
            <div className="m-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="mb-2 font-semibold text-amber-700 dark:text-amber-400">Unsaved changes</p>
              <div className="flex gap-2">
                <button type="button" onClick={runPending} className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white">Discard</button>
                <button type="button" onClick={() => setPending(null)} className="flex-1 rounded-lg border border-defaultborder/70 py-2 text-xs font-semibold">Keep editing</button>
              </div>
            </div>
          ) : showContactPane ? (
            <ContactContextPanel mode={contactMode ?? "read"} contact={selectedContact}
              initialDraft={createDraft} visibleNumbers={visibleNumbers}
              onCall={dialNow}
              onEdit={() => selectedContact && editContact(selectedContact)}
              onCancel={() => { setDirty(false); if (contactMode === "edit" && selectedContact) setContactMode("read"); else clearSelection(); }}
              onSaved={afterSaved} onDeleted={afterDeleted} onDirtyChange={setDirty} />
          ) : (
            <CallContextPanel record={selectedCall}
              onCall={dialNow}
              onSaveAsContact={saveAsContact} />
          )}
        </div>
      </div>
    </div>
  );
}
