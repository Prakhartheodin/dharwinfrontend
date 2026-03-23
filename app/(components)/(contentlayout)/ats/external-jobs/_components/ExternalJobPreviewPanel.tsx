"use client";

import React from "react";
import type { ExternalJob, ExternalJobSource } from "@/shared/lib/api/external-jobs";
import {
  formatJobDescriptionForDisplay,
  JOB_DESCRIPTION_PROSE_CLASS,
} from "@/shared/lib/ats/jobDescriptionHtml";

const SOURCE_LABELS: Record<ExternalJobSource, string> = {
  "active-jobs-db": "Active Jobs DB",
  "linkedin-jobs-api": "LinkedIn Jobs",
};

interface ExternalJobPreviewPanelProps {
  job: ExternalJob | null;
  onClose: () => void;
  isSaved: boolean;
  onSave: (job: ExternalJob) => void;
  onUnsave: (externalId: string, source: ExternalJobSource) => void;
  savingId: string | null;
}

const ExternalJobPreviewPanel: React.FC<ExternalJobPreviewPanelProps> = ({
  job,
  onClose,
  isSaved,
  onSave,
  onUnsave,
  savingId,
}) => {
  if (!job) return null;

  const handleClose = () => {
    const el = document.querySelector("#external-job-preview-panel");
    if (el) (window as any).HSOverlay?.close(el);
    onClose();
  };

  const saving = savingId === job.externalId;
  const sourceLabel = SOURCE_LABELS[job.source] || job.source;

  const salaryStr =
    job.salaryMin != null || job.salaryMax != null
      ? [job.salaryMin, job.salaryMax]
          .filter((n) => n != null)
          .map((n) => (job.salaryCurrency ? `${job.salaryCurrency} ` : "") + n?.toLocaleString())
          .join(" – ") || "—"
      : "—";

  const infoItems = [
    { icon: "ri-building-line", label: "Company", value: job.company },
    { icon: "ri-map-pin-line", label: "Location", value: job.location },
    { icon: "ri-suitcase-line", label: "Job Type", value: job.jobType },
    { icon: "ri-bar-chart-line", label: "Experience", value: job.experienceLevel },
    { icon: "ri-money-dollar-circle-line", label: "Salary", value: salaryStr !== "—" ? salaryStr : null },
    {
      icon: "ri-calendar-line",
      label: "Posted",
      value: job.timePosted || (job.postedAt ? new Date(job.postedAt).toLocaleDateString() : null),
    },
  ];

  const listingCta =
    job.source === "linkedin-jobs-api"
      ? { label: "View on LinkedIn", icon: "ri-linkedin-box-fill" as const }
      : { label: "Open original listing", icon: "ri-external-link-line" as const };

  return (
    <div
      id="external-job-preview-panel"
      className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
      tabIndex={-1}
    >
      <div className="ti-offcanvas-header flex items-start justify-between gap-4 border-b border-defaultborder/80 bg-gray-50/90 !px-5 !py-4 dark:border-defaultborder/10 dark:bg-black/25">
        <div className="min-w-0 flex-1">
          <h6 className="ti-offcanvas-title mb-2 flex items-center gap-2 text-base font-semibold text-defaulttextcolor dark:text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <i className="ri-briefcase-line text-lg" aria-hidden />
            </span>
            <span className="truncate leading-snug">{job.title || "Job preview"}</span>
          </h6>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                job.source === "active-jobs-db"
                  ? "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "border border-primary/25 bg-primary/10 text-primary"
              }`}
            >
              {sourceLabel}
            </span>
            {job.jobType && (
              <span className="inline-flex items-center rounded-full border border-defaultborder/50 bg-white/80 px-2.5 py-0.5 text-[0.7rem] font-medium text-defaulttextcolor dark:border-white/10 dark:bg-white/5">
                {job.jobType}
              </span>
            )}
            {job.isRemote && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-emerald-800 dark:text-emerald-200">
                <i className="ri-home-wifi-line me-1" aria-hidden />
                Remote
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="ti-btn flex-shrink-0 rounded-lg p-1 text-gray-500 transition-none hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/20"
          onClick={handleClose}
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg className="h-3.5 w-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path
              d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className="ti-offcanvas-body !p-0">
        <div className="grid grid-cols-1 gap-3 border-b border-defaultborder/60 bg-gradient-to-br from-slate-50/80 via-white/50 to-transparent p-4 sm:grid-cols-2 lg:grid-cols-3 dark:from-white/[0.03] dark:via-transparent dark:to-transparent">
          {infoItems
            .filter((item) => item.value)
            .map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-defaultborder/50 bg-white/90 p-3 shadow-sm ring-1 ring-black/[0.02] dark:border-white/10 dark:bg-bodybg/80 dark:ring-white/5"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/45">
                  <i className={`${item.icon} text-xs opacity-80`} aria-hidden />
                  {item.label}
                </div>
                <p
                  className="mb-0 truncate text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white"
                  title={item.value || ""}
                >
                  {item.value}
                </p>
              </div>
            ))}
        </div>

        {job.description && (
          <div className="p-5">
            <h6 className="mb-3 flex items-center gap-2 text-sm font-semibold text-defaulttextcolor dark:text-white">
              <i className="ri-file-text-line text-primary/80" aria-hidden />
              Description
            </h6>
            <div
              className={`${JOB_DESCRIPTION_PROSE_CLASS} max-h-[min(24rem,50vh)] overflow-y-auto rounded-2xl border border-defaultborder/60 bg-slate-50/80 p-4 text-[0.8125rem] dark:border-white/10 dark:bg-black/20`}
              dangerouslySetInnerHTML={{
                __html: formatJobDescriptionForDisplay(job.description),
              }}
            />
          </div>
        )}

        <div className="border-t border-defaultborder/60 bg-defaultbackground/60 p-4 dark:!bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => (isSaved ? onUnsave(job.externalId, job.source) : onSave(job))}
              className={`ti-btn !rounded-xl !py-2 !px-4 !text-[0.8125rem] font-medium shadow-sm ${
                isSaved ? "ti-btn-warning-full" : "ti-btn-primary-full"
              }`}
            >
              <i
                className={`${isSaved ? "ri-bookmark-fill" : "ri-bookmark-line"} me-1.5 ${saving ? "animate-pulse" : ""}`}
                aria-hidden
              />
              {saving ? "Saving…" : isSaved ? "Remove from saved" : "Save to list"}
            </button>
            {job.platformUrl && (
              <a
                href={job.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ti-btn ti-btn-success-full !rounded-xl !py-2 !px-4 !text-[0.8125rem] font-medium shadow-sm"
              >
                <i className={`${listingCta.icon} me-1.5`} aria-hidden />
                {listingCta.label}
              </a>
            )}
            <button type="button" onClick={handleClose} className="ti-btn ti-btn-light ms-auto !rounded-xl !py-2 !px-4 !text-[0.8125rem]">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalJobPreviewPanel;
