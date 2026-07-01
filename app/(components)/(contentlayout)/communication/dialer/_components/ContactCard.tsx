"use client";
import React from "react";
import type { Contact } from "@/shared/lib/api/contacts";
import { primaryPhone, contactInitials } from "../_lib/contactView";

type Props = {
  contact: Contact;
  selected: boolean;
  onSelect: () => void;
  onDial: () => void;
  onEdit: () => void;
};

export default function ContactCard({ contact, selected, onSelect, onDial, onEdit }: Props) {
  const number = primaryPhone(contact);
  return (
    <div className={`group rounded-xl px-3 py-2 ${selected ? "bg-primary/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"}`}>
      <button type="button" onClick={onSelect} aria-label={`Open ${contact.name}`}
        className="flex w-full items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {contactInitials(contact.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-defaulttextcolor dark:text-white">{contact.name}</span>
            {contact.favorite ? <i className="ri-star-fill text-[0.8rem] text-amber-400" aria-label="favorite" /> : null}
            {contact.doNotCall ? <span className="rounded bg-danger/15 px-1 text-[0.6rem] font-semibold uppercase text-danger">DNC</span> : null}
          </span>
          <span className="block truncate font-mono text-[0.72rem] text-defaulttextcolor/60 dark:text-white/50">{number}</span>
          {contact.company ? <span className="block truncate text-[0.72rem] text-defaulttextcolor/45">{contact.company}</span> : null}
        </span>
      </button>
      <div className="mt-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button type="button" onClick={onDial} aria-label={`Call ${contact.name}`}
          className="grid h-7 w-7 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-600/10">
          <i className="ri-phone-line" />
        </button>
        <button type="button" onClick={onEdit} aria-label={`Edit ${contact.name}`}
          className="grid h-7 w-7 place-items-center rounded-lg text-defaulttextcolor/60 hover:bg-black/[0.05] dark:hover:bg-white/10">
          <i className="ri-pencil-line" />
        </button>
      </div>
    </div>
  );
}
