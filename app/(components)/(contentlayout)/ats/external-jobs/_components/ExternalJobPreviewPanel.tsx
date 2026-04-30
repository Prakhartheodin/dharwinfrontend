"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ExternalJob, ExternalJobSource } from "@/shared/lib/api/external-jobs";
import {
  formatJobDescriptionForDisplay,
  JOB_DESCRIPTION_PROSE_CLASS,
} from "@/shared/lib/ats/jobDescriptionHtml";
import {
  enrichExternalJobContacts,
  saveHrContact,
  deleteSavedHrContact,
  listSavedHrContacts,
  type ApolloContact,
} from "@/shared/lib/api/external-jobs";

const SOURCE_LABELS: Record<ExternalJobSource, string> = {
  "active-jobs-db": "Active Jobs DB",
  "linkedin-jobs-api": "LinkedIn Jobs",
};

const AVATAR_PALETTE = [
  "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-sky-500",
  "bg-teal-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-rose-500",
];
function companyAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

interface ExternalJobPreviewPanelProps {
  job: ExternalJob | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onSave: (job: ExternalJob) => void;
  onUnsave: (externalId: string, source: ExternalJobSource) => void;
  savingId: string | null;
}

const ExternalJobPreviewPanel: React.FC<ExternalJobPreviewPanelProps> = ({
  job,
  isOpen,
  onClose,
  isSaved,
  onSave,
  onUnsave,
  savingId,
}) => {
  const [enriching, setEnriching] = useState(false);
  const [contacts, setContacts] = useState<ApolloContact[]>([]);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [savedContactIds, setSavedContactIds] = useState<Set<string>>(new Set());
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    setContacts([]);
    setEnrichError(null);
    inFlight.current = false;
  }, [job?.externalId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    listSavedHrContacts().then((res) => {
      setSavedContactIds(new Set(res.contacts.map((c) => c.apolloId)));
    }).catch(() => {});
  }, [isOpen]);

  const handleFindContacts = async () => {
    if (!job?.company || inFlight.current) return;
    inFlight.current = true;
    setEnriching(true);
    setEnrichError(null);
    try {
      const result = await enrichExternalJobContacts(job.company, job.externalId, job.location);
      setContacts(result.contacts || []);
    } catch {
      setEnrichError("Failed to find contacts. Please try again.");
    } finally {
      setEnriching(false);
      inFlight.current = false;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback("Copy failed");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleSaveContact = async (c: ApolloContact) => {
    if (savingContactId) return;
    setSavingContactId(c.apolloId);
    try {
      if (savedContactIds.has(c.apolloId)) {
        await deleteSavedHrContact(c.apolloId);
        setSavedContactIds((prev) => { const s = new Set(prev); s.delete(c.apolloId); return s; });
      } else {
        await saveHrContact({ ...c, companyName: job?.company || '' });
        setSavedContactIds((prev) => new Set([...prev, c.apolloId]));
      }
    } catch {
      // ignore
    } finally {
      setSavingContactId(null);
    }
  };

  const saving = job ? savingId === job.externalId : false;
  const sourceLabel = job ? (SOURCE_LABELS[job.source] || job.source) : "";
  const avatarBg = job?.company ? companyAvatarColor(job.company) : "bg-primary";
  const avatarInitial = job?.company ? job.company.trim()[0].toUpperCase() : "?";

  const salaryStr = job
    ? job.salaryMin != null || job.salaryMax != null
      ? [job.salaryMin, job.salaryMax]
          .filter((n) => n != null)
          .map((n) => (job.salaryCurrency ? `${job.salaryCurrency} ` : "") + n?.toLocaleString())
          .join(" – ")
      : null
    : null;

  const quickFacts = job ? [
    salaryStr && { icon: "ri-money-dollar-circle-line", label: "Salary", value: salaryStr, chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" },
    job.jobType && { icon: "ri-suitcase-line", label: "Type", value: job.jobType, chip: "bg-primary/[0.07] text-primary ring-primary/20" },
    job.experienceLevel && { icon: "ri-bar-chart-line", label: "Level", value: job.experienceLevel, chip: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20" },
    (job.timePosted || job.postedAt) && {
      icon: "ri-calendar-line",
      label: "Posted",
      value: job.timePosted || (job.postedAt ? new Date(job.postedAt).toLocaleDateString() : ""),
      chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    },
  ].filter(Boolean) as { icon: string; label: string; value: string; chip: string }[] : [];

  const listingCta = job?.source === "linkedin-jobs-api"
    ? { label: "View on LinkedIn", icon: "ri-linkedin-box-fill" }
    : { label: "Open listing", icon: "ri-external-link-line" };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 z-[104] bg-black/35 backdrop-blur-[3px] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* ── Drawer panel ── */}
      <div
        className={`fixed inset-y-0 right-0 z-[105] flex w-full max-w-[46rem] flex-col bg-white shadow-[-32px_0_80px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] dark:bg-[#141621] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={job?.title ?? "Job preview"}
      >
        {job ? (
          <>
            {/* ═══ Hero header ═══ */}
            <div className="relative shrink-0 overflow-hidden">
              {/* gradient bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-white to-violet-400/[0.05] dark:from-primary/[0.14] dark:via-[#141621] dark:to-violet-500/[0.07]" />
              {/* subtle grid overlay */}
              <div
                className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
                style={{
                  backgroundImage: "linear-gradient(#888 1px,transparent 1px),linear-gradient(90deg,#888 1px,transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative px-6 pb-5 pt-5">
                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-gray-500 transition-all hover:bg-black/10 hover:text-gray-800 dark:bg-white/[0.06] dark:text-white/50 dark:hover:bg-white/12 dark:hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 8 8" fill="none" aria-hidden>
                    <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor" />
                  </svg>
                </button>

                {/* Company avatar + title */}
                <div className="flex items-start gap-4 pe-10">
                  <div className={`flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl text-[1.3rem] font-black text-white shadow-lg ring-2 ring-white/60 dark:ring-white/10 ${avatarBg}`}>
                    {avatarInitial}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="mb-0.5 text-[1.05rem] font-bold leading-snug text-defaulttextcolor dark:text-white">
                      {job.title || "Job preview"}
                    </h2>
                    <p className="mb-2.5 flex flex-wrap items-center gap-x-2 text-sm text-textmuted dark:text-white/55">
                      {job.company && <span className="font-medium text-defaulttextcolor/80 dark:text-white/80">{job.company}</span>}
                      {job.company && job.location && <span className="opacity-30">·</span>}
                      {job.location && (
                        <span className="flex items-center gap-0.5">
                          <i className="ri-map-pin-2-line text-xs opacity-60" aria-hidden />
                          {job.location}
                        </span>
                      )}
                    </p>

                    {/* Source / type / remote badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[0.68rem] font-semibold ring-1 ${
                        job.source === "active-jobs-db"
                          ? "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25"
                          : "bg-primary/[0.07] text-primary ring-primary/20"
                      }`}>
                        <i className={`${job.source === "linkedin-jobs-api" ? "ri-linkedin-box-fill" : "ri-database-2-line"} text-[0.6rem]`} aria-hidden />
                        {sourceLabel}
                      </span>
                      {job.jobType && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-[3px] text-[0.68rem] font-medium text-gray-700 ring-1 ring-gray-200/80 dark:bg-white/8 dark:text-white/65 dark:ring-white/10">
                          {job.jobType}
                        </span>
                      )}
                      {job.isRemote && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-[3px] text-[0.68rem] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                          <i className="ri-home-wifi-line text-[0.6rem]" aria-hidden />
                          Remote
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick-fact chips */}
                {quickFacts.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickFacts.map((f) => (
                      <div
                        key={f.label}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.72rem] font-semibold ring-1 ${f.chip}`}
                      >
                        <i className={`${f.icon} text-[0.65rem] opacity-80`} aria-hidden />
                        {f.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ Scrollable body ═══ */}
            <div className="flex-1 overflow-y-auto divide-y divide-defaultborder/40 dark:divide-white/[0.06]">

              {/* Description */}
              {job.description && (
                <section className="px-6 py-5">
                  <h3 className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-textmuted dark:text-white/35">
                    <i className="ri-file-text-line" aria-hidden />
                    Description
                  </h3>
                  <div
                    className={`${JOB_DESCRIPTION_PROSE_CLASS} max-h-[min(20rem,44vh)] overflow-y-auto rounded-2xl border border-defaultborder/50 bg-slate-50/70 px-5 py-4 text-[0.8125rem] leading-relaxed dark:border-white/[0.07] dark:bg-white/[0.025]`}
                    dangerouslySetInnerHTML={{ __html: formatJobDescriptionForDisplay(job.description) }}
                  />
                </section>
              )}

              {/* HR Contacts */}
              <section className="px-6 py-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-textmuted dark:text-white/35">
                    <i className="ri-contacts-line" aria-hidden />
                    HR Contacts
                    {contacts.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-bold text-primary dark:bg-primary/20">
                        {contacts.length}
                      </span>
                    )}
                  </h3>

                  {contacts.length === 0 && (
                    <button
                      type="button"
                      onClick={handleFindContacts}
                      disabled={enriching || !job.company}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[0.75rem] font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {enriching ? (
                        <i className="ri-loader-4-line animate-spin text-xs" aria-hidden />
                      ) : (
                        <i className="ri-user-search-line text-xs" aria-hidden />
                      )}
                      {enriching ? "Searching…" : "Find HR Contact"}
                    </button>
                  )}
                </div>

                {/* copy toast */}
                {copyFeedback && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <i className="ri-checkbox-circle-fill text-sm" aria-hidden />
                    {copyFeedback}
                  </div>
                )}

                {/* error */}
                {enrichError && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    <i className="ri-error-warning-fill text-sm" aria-hidden />
                    {enrichError}
                  </div>
                )}

                {/* empty state */}
                {contacts.length === 0 && !enriching && !enrichError && (
                  <div className="rounded-2xl border border-dashed border-defaultborder/70 bg-slate-50/40 px-5 py-8 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <span className="mb-2 block text-2xl opacity-20 dark:opacity-15">
                      <i className="ri-user-search-line" aria-hidden />
                    </span>
                    <p className="text-xs leading-relaxed text-textmuted dark:text-white/35">
                      Click "Find HR Contact" to search Apollo.io<br />for recruiting contacts at this company.
                    </p>
                  </div>
                )}

                {/* Contact cards */}
                <div className="flex flex-col gap-3">
                  {contacts.map((c) => (
                    <div
                      key={c.apolloId}
                      className="overflow-hidden rounded-2xl border border-defaultborder/50 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]"
                    >
                      {/* card header */}
                      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50/90 to-transparent px-4 py-3 dark:from-white/[0.04] dark:to-transparent">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.75rem] font-bold text-primary ring-1 ring-primary/15 dark:bg-primary/20">
                          {(c.firstName[0] || "").toUpperCase()}{(c.lastName[0] || "").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.8125rem] font-semibold leading-tight text-defaulttextcolor dark:text-white">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.title && (
                            <p className="truncate text-[0.7rem] text-textmuted dark:text-white/40">{c.title}</p>
                          )}
                          {c.location && (
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-textmuted/70 dark:text-white/30">
                              <i className="ri-map-pin-line text-[0.6rem]" aria-hidden />
                              {c.location}
                            </p>
                          )}
                        </div>
                        {/* Save button */}
                        <button
                          type="button"
                          title={savedContactIds.has(c.apolloId) ? "Remove from saved contacts" : "Save contact"}
                          disabled={savingContactId === c.apolloId}
                          onClick={() => handleSaveContact(c)}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-all active:scale-95 ${
                            savedContactIds.has(c.apolloId)
                              ? "bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary/90"
                              : "bg-gray-100 text-gray-400 hover:bg-primary/10 hover:text-primary dark:bg-white/8 dark:text-white/30 dark:hover:bg-primary/15 dark:hover:text-primary"
                          }`}
                        >
                          <i className={`${savedContactIds.has(c.apolloId) ? "ri-user-follow-fill" : "ri-user-add-line"} ${savingContactId === c.apolloId ? "animate-pulse" : ""}`} aria-hidden />
                        </button>
                      </div>

                      {/* contact rows */}
                      <div className="flex flex-col gap-2 px-4 pb-3 pt-2">
                        {/* Email */}
                        {c.email ? (
                          <div className="flex items-center gap-2.5 rounded-xl bg-primary/[0.05] px-3.5 py-2.5 dark:bg-primary/[0.09]">
                            <i className="ri-mail-line shrink-0 text-[0.9rem] text-primary" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-defaulttextcolor dark:text-white/75">{c.email}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.email, "Email copied")}
                              className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[0.65rem] font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 dark:bg-primary/20 dark:hover:bg-primary/30"
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 dark:bg-white/[0.03]">
                            <i className="ri-mail-off-line shrink-0 text-[0.9rem] text-textmuted/40" aria-hidden />
                            <span className="text-xs text-textmuted/60 dark:text-white/25">No email available</span>
                          </div>
                        )}

                        {/* Phone */}
                        {c.phoneNumbers && c.phoneNumbers.length > 0 ? (
                          c.phoneNumbers.map((p, i) => (
                            <div key={i} className="flex items-center gap-2.5 rounded-xl bg-emerald-50/80 px-3.5 py-2.5 dark:bg-emerald-500/[0.08]">
                              <i className="ri-phone-line shrink-0 text-[0.9rem] text-emerald-600 dark:text-emerald-400" aria-hidden />
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-defaulttextcolor dark:text-white/75">{p.rawNumber}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(p.sanitizedNumber, "Phone copied")}
                                className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-700 transition-all hover:bg-emerald-200 active:scale-95 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                              >
                                Copy
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 dark:bg-white/[0.03]">
                            <i className="ri-phone-off-line shrink-0 text-[0.9rem] text-textmuted/40" aria-hidden />
                            <span className="text-xs text-textmuted/60 dark:text-white/25">No phone number available</span>
                          </div>
                        )}

                        {/* LinkedIn */}
                        {c.linkedinUrl ? (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-xl bg-sky-50/80 px-3.5 py-2.5 transition-colors hover:bg-sky-100/80 dark:bg-sky-500/[0.07] dark:hover:bg-sky-500/[0.13]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="ri-linkedin-box-fill shrink-0 text-[0.9rem] text-sky-600 dark:text-sky-400" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-sky-700 dark:text-sky-300">View LinkedIn profile</span>
                            <i className="ri-external-link-line shrink-0 text-[0.75rem] text-sky-500/60" aria-hidden />
                          </a>
                        ) : (
                          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 dark:bg-white/[0.03]">
                            <i className="ri-linkedin-box-line shrink-0 text-[0.9rem] text-textmuted/40" aria-hidden />
                            <span className="text-xs text-textmuted/60 dark:text-white/25">No LinkedIn profile available</span>
                          </div>
                        )}

                        {/* Location */}
                        {c.location ? (
                          <div className="flex items-center gap-2.5 rounded-xl bg-violet-50/80 px-3.5 py-2.5 dark:bg-violet-500/[0.07]">
                            <i className="ri-map-pin-2-line shrink-0 text-[0.9rem] text-violet-600 dark:text-violet-400" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-violet-700 dark:text-violet-300">{c.location}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 dark:bg-white/[0.03]">
                            <i className="ri-map-pin-line shrink-0 text-[0.9rem] text-textmuted/40" aria-hidden />
                            <span className="text-xs text-textmuted/60 dark:text-white/25">No location available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ═══ Sticky footer ═══ */}
            <div className="shrink-0 border-t border-defaultborder/50 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-white/[0.07] dark:bg-[#141621]/95">
              <div className="flex flex-wrap items-center gap-2">
                {/* Primary: Save */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => (isSaved ? onUnsave(job.externalId, job.source) : onSave(job))}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[0.8125rem] font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                    isSaved
                      ? "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600 hover:shadow-amber-500/35 hover:shadow-md"
                      : "bg-primary text-white shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/35 hover:shadow-md"
                  }`}
                >
                  <i className={`${isSaved ? "ri-bookmark-fill" : "ri-bookmark-line"} text-sm ${saving ? "animate-pulse" : ""}`} aria-hidden />
                  {saving ? "Saving…" : isSaved ? "Saved" : "Save job"}
                </button>

                {/* Secondary: Open listing */}
                {job.platformUrl && (
                  <a
                    href={job.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/70 bg-white px-4 py-2.5 text-[0.8125rem] font-semibold text-defaulttextcolor shadow-sm transition-all hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 dark:hover:border-primary/30 dark:hover:bg-primary/10 dark:hover:text-primary"
                  >
                    <i className={`${listingCta.icon} text-sm`} aria-hidden />
                    {listingCta.label}
                  </a>
                )}

                {/* Ghost: Close */}
                <button
                  type="button"
                  onClick={onClose}
                  className="ms-auto rounded-xl px-4 py-2.5 text-[0.8125rem] font-medium text-textmuted/80 transition-colors hover:bg-defaultborder/30 hover:text-defaulttextcolor dark:text-white/35 dark:hover:bg-white/[0.07] dark:hover:text-white/70"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};

export default ExternalJobPreviewPanel;
