"use client";

import React from "react";
import type { ExternalJob, ExternalJobSource } from "@/shared/lib/api/external-jobs";

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

  return (
    <div
      id="external-job-preview-panel"
      className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
      tabIndex={-1}
    >
      {/* Header */}
      <div className="ti-offcanvas-header !py-3 !px-4 border-b border-gray-200 dark:border-defaultborder/10">
        <div className="flex-1 min-w-0">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2 mb-1">
            <i className="ri-briefcase-line text-primary text-lg" />
            <span className="truncate">{job.title || "Job Preview"}</span>
          </h6>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`badge text-[0.7rem] ${
                job.source === "active-jobs-db" ? "bg-info/10 text-info" : "bg-primary/10 text-primary"
              }`}
            >
              {sourceLabel}
            </span>
            {job.jobType && (
              <span className="badge bg-gray-100 dark:bg-white/10 text-defaulttextcolor text-[0.7rem]">
                {job.jobType}
              </span>
            )}
            {job.isRemote && (
              <span className="badge bg-success/10 text-success text-[0.7rem]">
                <i className="ri-home-wifi-line me-1" />
                Remote
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="ti-btn ti-btn-light !p-1.5 !rounded-full flex-shrink-0"
          onClick={handleClose}
          aria-label="Close"
        >
          <i className="ri-close-line text-lg" />
        </button>
      </div>

      {/* Body */}
      <div className="ti-offcanvas-body !p-0">
        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border-b border-gray-200 dark:border-defaultborder/10">
          {infoItems
            .filter((item) => item.value)
            .map((item) => (
              <div
                key={item.label}
                className="p-3 border-b border-e border-gray-100 dark:border-defaultborder/10 last:border-e-0"
              >
                <div className="flex items-center gap-1.5 text-[0.7rem] text-gray-500 dark:text-gray-400 mb-1">
                  <i className={`${item.icon} text-xs`} />
                  {item.label}
                </div>
                <p className="font-medium text-[0.8125rem] text-gray-800 dark:text-white mb-0 truncate" title={item.value || ""}>
                  {item.value}
                </p>
              </div>
            ))}
        </div>

        {/* Description */}
        {job.description && (
          <div className="p-4">
            <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <i className="ri-file-text-line text-gray-400" />
              Job Description
            </h6>
            <div
              className="text-[0.8125rem] leading-relaxed text-gray-600 dark:text-gray-300 prose dark:prose-invert max-w-none max-h-[400px] overflow-y-auto p-3 bg-gray-50 dark:bg-black/10 rounded-lg border border-gray-100 dark:border-defaultborder/10"
              dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, "<br />") }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-defaultborder/10 bg-gray-50/50 dark:bg-black/10">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => (isSaved ? onUnsave(job.externalId, job.source) : onSave(job))}
              className={`ti-btn !py-1.5 !px-4 !text-[0.8125rem] ${
                isSaved ? "ti-btn-warning-full" : "ti-btn-primary-full"
              }`}
            >
              <i className={`${isSaved ? "ri-bookmark-fill" : "ri-bookmark-line"} me-1.5 ${saving ? "animate-pulse" : ""}`} />
              {saving ? "Saving..." : isSaved ? "Unsave" : "Save Job"}
            </button>
            {job.platformUrl && (
              <a
                href={job.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ti-btn !py-1.5 !px-4 !text-[0.8125rem] ti-btn-success-full"
              >
                <i className="ri-linkedin-box-fill me-1.5" />
                View on LinkedIn
              </a>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="ti-btn !py-1.5 !px-4 !text-[0.8125rem] ti-btn-light ms-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalJobPreviewPanel;
