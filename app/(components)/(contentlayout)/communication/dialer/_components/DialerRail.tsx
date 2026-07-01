"use client";
import React from "react";
import type { CallRecord } from "@/shared/lib/api/bolna";
import type { Contact } from "@/shared/lib/api/contacts";
import RecentCallsList from "./RecentCallsList";
import ContactsList from "./ContactsList";

export type View = "recent" | "missed" | "contacts" | "favorites";

type Props = {
  view: View;
  missedCount: number;
  onViewChange: (v: View) => void;
  selectedCallId: string | null;
  selectedContactId: string | null;
  refreshKey: number;
  searchRef: React.Ref<HTMLInputElement>;
  onSelectCall: (r: CallRecord) => void;
  onDialCall: (r: CallRecord) => void;
  onMissedCount: (n: number) => void;
  onSelectContact: (c: Contact) => void;
  onDialContact: (number: string) => void;
  onEditContact: (c: Contact) => void;
  onNewContact: () => void;
  onLoaded: (contacts: Contact[]) => void;
};

const NAV: { key: View; label: string; icon: string }[] = [
  { key: "recent", label: "Recent", icon: "ri-time-line" },
  { key: "missed", label: "Missed", icon: "ri-phone-lock-line" },
  { key: "contacts", label: "Contacts", icon: "ri-user-3-line" },
  { key: "favorites", label: "Favorites", icon: "ri-star-line" },
];

export default function DialerRail(props: Props) {
  const { view, missedCount, onViewChange } = props;
  const isContacts = view === "contacts" || view === "favorites";
  return (
    <div className="flex h-full flex-col">
      <nav className="px-3 pb-1 pt-3">
        {NAV.map((n) => (
          <button key={n.key} type="button" onClick={() => onViewChange(n.key)}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              view === n.key ? "bg-primary/10 text-primary" : "text-defaulttextcolor/70 hover:bg-black/[0.03] dark:text-white/70 dark:hover:bg-white/5"
            }`}>
            <i className={n.icon} aria-hidden /> {n.key === "missed" ? `Missed (${missedCount})` : n.label}
          </button>
        ))}
        <span title="Coming soon"
          className="mb-1 flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-defaulttextcolor/35 dark:text-white/25">
          <i className="ri-voiceprint-line" aria-hidden /> Voicemail
          <span className="ms-auto rounded-full bg-defaultborder/50 px-1.5 text-[0.6rem] font-semibold uppercase">Soon</span>
        </span>
      </nav>

      <div className="min-h-0 flex-1">
        {isContacts ? (
          <ContactsList view={view === "favorites" ? "favorites" : "contacts"}
            selectedContactId={props.selectedContactId} refreshKey={props.refreshKey}
            onSelectContact={props.onSelectContact} onDialContact={props.onDialContact}
            onEditContact={props.onEditContact} onNewContact={props.onNewContact} onLoaded={props.onLoaded} />
        ) : (
          <RecentCallsList activeView={view === "missed" ? "missed" : "recent"}
            selectedCallId={props.selectedCallId} onSelectCall={props.onSelectCall}
            onDialCall={props.onDialCall} searchRef={props.searchRef} onMissedCount={props.onMissedCount} />
        )}
      </div>
    </div>
  );
}
