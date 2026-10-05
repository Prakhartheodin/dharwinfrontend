"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { SimpleModal } from "@/shared/components/ui/SimpleModal";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import {
  DEFAULT_APPLICATION_SORT,
  readApplicationsFromQuery,
  writeApplicationsToQuery,
} from "@/shared/lib/ats/application-list-filters";
import ListPagination from "@/shared/components/ListPagination";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  listJobApplications,
  updateJobApplicationStatus,
  type JobApplication,
  type JobApplicationStatus,
} from "@/shared/lib/api/jobApplications";
import { getJobFilterOptions, type JobFilterOptionItem } from "@/shared/lib/api/jobs";
import {
  isInternalRelayEmail,
  pickPublicEmail,
  resolveApplicantEmail,
} from "@/shared/lib/ats/applicant-email";
import {
  getInterviewSchedulingBlockReason,
  isInterviewSchedulingBlocked,
  PIPELINE_STATUSES,
  STATUS_STYLE,
} from "@/shared/lib/ats/applicationPipeline";
import { ApplicationStatusSelect } from "@/shared/components/ats/ApplicationStatusSelect";
import { getApiErrorMessage } from "@/shared/lib/api/client";
import { YmdFilterDateInput } from "@/shared/components/filters/YmdFilterDateInput";
import { getReferralLeadsDateRangeError, getYmdDateRangeIncompleteError } from "@/shared/lib/ymd-filter-date-input.util";
import { alertYmdDateRangeIncomplete } from "@/shared/lib/ymd-filter-date-range-alert";
import {
  ApplicantFitChips,
  CulturalFitCell,
  SuccessProbabilityCell,
  applicantFitNeedsWarm,
} from "./_components/ApplicantFitCells";
import {
  ApplicantFitColumnHeader,
} from "./_components/ApplicantFitInfoDrawer";
import { APPLICATIONS_TABLE_COLUMN_CLASS } from "./_components/applicationsTableResponsive";
import { useApplicationsListContainerLayout } from "./_components/useApplicationsListContainerLayout";

const RoundHistoryPanel = dynamic(
  () => import("@/shared/components/interview/RoundHistoryPanel"),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-defaulttextcolor/60">Loading rounds…</div> },
);

const ApplicantFitInfoDrawer = dynamic(
  () => import("./_components/ApplicantFitInfoDrawer").then((m) => m.ApplicantFitInfoDrawer),
  { ssr: false },
);

const APP_COL = APPLICATIONS_TABLE_COLUMN_CLASS;

const APPLIED_FROM_INPUT_ID = "applications-applied-from";
const APPLIED_TO_INPUT_ID = "applications-applied-to";
const SEARCH_INPUT_ID = "applications-search";

const SKELETON_PULSE = "bg-gray-100 dark:bg-white/5 rounded motion-safe:animate-pulse motion-reduce:animate-none";

/** Same default as Onboarding / Jobs / Students / Recruiters. */
const LIST_PAGE_SIZE = 10;

const FILTER_LABEL =
  "form-label text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50 mb-1 block";
const FILTER_CONTROL_HEIGHT = "!h-[2.75rem] sm:!h-9";
// ti-form-select ships py-3; inside a fixed 2.75rem/9 height that clips text vertically and
// can make short labels look like ellipsis. Match ReferralLeads: form-select + zero vertical
// padding with line-height equal to control height.
const FILTER_CONTROL_TYPO =
  "!py-0 !px-3 !leading-[2.75rem] sm:!leading-9 !text-[0.875rem] sm:!text-[0.8125rem]";
const FILTER_SELECT = `form-select form-select-sm w-full min-w-0 ${FILTER_CONTROL_HEIGHT} ${FILTER_CONTROL_TYPO} !pe-9`;
const FILTER_INPUT = `ti-form-control form-control-sm w-full min-w-0 ${FILTER_CONTROL_HEIGHT} ${FILTER_CONTROL_TYPO}`;
const FILTER_DATE_INPUT = `ti-form-control form-control-sm w-full min-w-0 ${FILTER_CONTROL_HEIGHT} ${FILTER_CONTROL_TYPO} !rounded-xl`;
const FILTER_DATE_WRAPPER =
  "min-w-0 w-full [&_.react-datepicker-wrapper]:w-full [&_.react-datepicker__input-container]:w-full [&_.react-datepicker__input-container_input]:!h-[2.75rem] sm:[&_.react-datepicker__input-container_input]:!h-9 [&_.react-datepicker__input-container_input]:!py-0 [&_.react-datepicker__input-container_input]:!leading-[2.75rem] sm:[&_.react-datepicker__input-container_input]:!leading-9";

function useNarrowViewport(maxWidthPx: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidthPx]);
  return narrow;
}

function formatDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

type ApplicationWithDocs = JobApplication & {
  candidate: JobApplication["candidate"] & {
    department?: string | null;
    documents?: Array<{ type?: string; url?: string }>;
    profilePicture?: { url?: string };
    employeeId?: string | null;
    referralPipelineStatus?: string | null;
  };
};

/** A document link shown against an application, and where it came from. */
type ApplicationDocLink = {
  url: string;
  /** Tooltip: which file, which version, and whether it is the submitted one. */
  title: string;
  /** False when falling back to the candidate's live profile file (pre-snapshot applications). */
  isSubmitted: boolean;
};

type SubmittedFile = NonNullable<JobApplication["submittedResume"]>;

function fromSnapshot(snap: SubmittedFile | null | undefined, noun: string): ApplicationDocLink | null {
  if (!snap?.documentUrl) return null;
  const name = snap.originalName || noun;
  const version = snap.version != null ? ` (v${snap.version})` : "";
  return { url: snap.documentUrl, title: `${name}${version} — sent with this application`, isSubmitted: true };
}

/**
 * The file the recruiter should open. Prefers the immutable snapshot captured at apply time; a
 * candidate who later uploads a new version must not retroactively change what this link opens.
 * Falls back to the live profile document only for applications created before snapshots existed.
 */
function getResumeLink(app: ApplicationWithDocs): ApplicationDocLink | null {
  const snapshot = fromSnapshot(app.submittedResume, "Resume");
  if (snapshot) return snapshot;
  const docs = app.candidate?.documents ?? [];
  const resume = docs.find((d) => d?.type === "Resume" || d?.type === "CV/Resume");
  if (!resume?.url) return null;
  return {
    url: resume.url,
    title: "Current profile resume — this application predates resume versioning",
    isSubmitted: false,
  };
}

/** Cover letter has no profile fallback: absent means the applicant sent none. */
function getCoverLetterLink(app: ApplicationWithDocs): ApplicationDocLink | null {
  return fromSnapshot(app.submittedCoverLetter, "Cover letter");
}

type ApplicationRowMeta = {
  id: string;
  candidateId: string;
  name: string;
  emailDisplay: string;
  emailForMailto: string | null;
  jobTitle: string;
  orgName?: string;
  dept: string;
  resumeLink: ApplicationDocLink | null;
  coverLetterLink: ApplicationDocLink | null;
  profileHref: string;
  jobId: string;
  appliedAt?: string | null;
  isEmployee: boolean;
  profilePhotoUrl?: string | null;
};


function jobOrganisationSubtitle(jobTitle: string, orgName?: string | null): string | null {
  const title = jobTitle.trim();
  const org = orgName?.trim();
  if (!org || org === "—") return null;
  if (title && org.toLowerCase() === title.toLowerCase()) return null;
  return org;
}

function getApplicationRowMeta(app: ApplicationWithDocs): ApplicationRowMeta {
  const id = String(app._id ?? app.id ?? "");
  const c = app.candidate ?? ({} as ApplicationWithDocs["candidate"]);
  const candidateId = String(c._id ?? c.id ?? "");
  const applicantUser = (app as { applicantUser?: { name?: string; email?: string } }).applicantUser;
  const candidateIsSynthetic = isInternalRelayEmail(c.email);
  const safeEmailForName = candidateIsSynthetic
    ? ""
    : pickPublicEmail([applicantUser?.email, c.email]) ?? "";
  const name = (
    c.fullName ||
    applicantUser?.name ||
    safeEmailForName ||
    "Unknown Applicant"
  ).trim() || "Unknown Applicant";
  const emailDisplay = resolveApplicantEmail({
    candidate: c as Parameters<typeof resolveApplicantEmail>[0]["candidate"],
    application: app as Parameters<typeof resolveApplicantEmail>[0]["application"],
    applicantUser,
  });
  const emailForMailto = candidateIsSynthetic
    ? null
    : pickPublicEmail([applicantUser?.email, c.email]);
  const j = app.job ?? ({} as JobApplication["job"]);
  return {
    id,
    candidateId,
    name,
    emailDisplay,
    emailForMailto,
    jobTitle: j.title ?? "—",
    orgName: j.organisation?.name,
    dept: c.department ?? "—",
    resumeLink: getResumeLink(app),
    coverLetterLink: getCoverLetterLink(app),
    profileHref: candidateId ? `/ats/employees/edit?id=${candidateId}` : "#",
    jobId: String(j._id ?? j.id ?? ""),
    appliedAt: app.appliedAt ?? app.createdAt,
    // Employee = already on staff (permanent DBS employeeId) or fully converted in the
    // referral pipeline. Distinguishes internal-mobility applicants from outside candidates.
    isEmployee:
      Boolean(c.employeeId && String(c.employeeId).trim()) ||
      ["employee", "joined", "resigned"].includes(String(c.referralPipelineStatus ?? "")),
    profilePhotoUrl: c.profilePicture?.url?.trim() || null,
  };
}

// Employee = applicant is already staff (permanent DBS employeeId / converted in pipeline)
// applying internally; Candidate = not yet an employee.
function ApplicationApplicantAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photoUrl?.trim()) && !photoFailed;
  const avatarClass =
    "avatar avatar-sm bg-primary/10 text-[#724bb7] dark:text-purple-300 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 !h-8 !w-8";
  if (showPhoto) {
    return (
      <img
        src={photoUrl!}
        alt=""
        width={32}
        height={32}
        sizes="32px"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${avatarClass} object-cover !p-0 bg-transparent text-[0.6875rem]`}
        onError={() => setPhotoFailed(true)}
      />
    );
  }
  return <span className={`${avatarClass} text-[0.6875rem]`}>{getInitials(name)}</span>;
}

function ApplicantTypeBadge({
  isEmployee,
  inline = false,
}: {
  isEmployee: boolean;
  inline?: boolean;
}) {
  return (
    <span
      className={`${inline ? "" : "mt-0.5"} inline-block shrink-0 text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full ${
        isEmployee
          ? "bg-primary/10 text-primary dark:text-purple-300"
          : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70"
      }`}
    >
      {isEmployee ? "Employee" : "Candidate"}
    </span>
  );
}

/**
 * Resume + cover letter for one application. Rendered in both the card and table layouts, so the
 * two can never drift on which file they open.
 */
function ApplicationDocLinks({
  resume,
  coverLetter,
  compact = false,
}: {
  resume: ApplicationDocLink | null;
  coverLetter: ApplicationDocLink | null;
  /** Table cell: shorter labels, since the column header already says "Documents". */
  compact?: boolean;
}) {
  const linkClass =
    "inline-flex items-center gap-1 text-primary dark:text-purple-300 dark:hover:text-purple-200 hover:underline text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded";
  return (
    <div className="flex flex-col items-start gap-1">
      {resume ? (
        <a
          href={resume.url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title={resume.title}
        >
          <i className="ri-file-pdf-2-line" aria-hidden /> {compact ? "Resume" : "View resume"}
          {/* Says in words, not colour alone, that this is the live profile file rather than the
              one that was sent — otherwise an old application looks identical to a current one. */}
          {resume.isSubmitted ? null : (
            <span className="text-[0.625rem] font-normal text-defaulttextcolor/50 dark:text-white/50">(profile)</span>
          )}
        </a>
      ) : (
        <span className="text-defaulttextcolor/60 dark:text-white/60 text-xs">{compact ? "—" : "No resume"}</span>
      )}
      {coverLetter ? (
        <a
          href={coverLetter.url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title={coverLetter.title}
        >
          <i className="ri-file-text-line" aria-hidden /> {compact ? "Cover letter" : "View cover letter"}
        </a>
      ) : null}
    </div>
  );
}

const APPLICATIONS_TABLE_ACTION_BTN =
  "ti-btn ti-btn-icon ti-btn-sm ti-btn-light !h-8 !w-8 !min-h-8 !min-w-8 !p-0 !text-defaulttextcolor/70 hover:!bg-primary/10 hover:!text-primary disabled:!opacity-40";

/** Overrides ti-dropdown-item hover:text-primary (unreadable on dark:bg-bodybg when disabled + hovered). */
const APPLICATIONS_ROW_MORE_MENU_ITEM =
  "ti-dropdown-item !py-2 !px-3 !text-[0.8125rem] w-full text-left inline-flex items-center gap-2 text-defaulttextcolor dark:text-white hover:!bg-primary/[0.05] hover:!text-defaulttextcolor dark:hover:!bg-primary/5 dark:hover:!text-white disabled:cursor-not-allowed disabled:!text-gray-400 disabled:hover:!text-gray-400 dark:disabled:!text-gray-500 dark:disabled:hover:!text-gray-500";

const APPLICATIONS_ROW_MORE_MENU_ITEM_DANGER =
  `${APPLICATIONS_ROW_MORE_MENU_ITEM} !text-rose-600 dark:!text-rose-400 hover:!text-rose-600 dark:hover:!text-rose-400 disabled:!text-gray-400 disabled:hover:!text-gray-400 dark:disabled:!text-gray-500 dark:disabled:hover:!text-gray-500`;

/** Portal menu — Preline hs-dropdown is not re-inited after list fetch and is clipped by overflow-x on the table scrollport. */
function ApplicationTableRowMoreMenu({
  meta,
  appStatus,
  isUpdating,
  scheduleBlocked,
  scheduleTitle,
  onReject,
  onSchedule,
  onRounds,
}: {
  meta: ApplicationRowMeta;
  appStatus: JobApplicationStatus;
  isUpdating: boolean;
  scheduleBlocked: boolean;
  scheduleTitle: string;
  onReject: () => void;
  onSchedule: () => void;
  onRounds: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRootRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const updateMenuPos = useCallback(() => {
    const btn = menuBtnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = Math.max(176, menu?.offsetWidth ?? 176);
    const menuHeight = menu?.offsetHeight ?? 160;
    const pad = 8;

    let left = rect.right - menuWidth;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));

    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - menuHeight - 4);
    }

    setMenuPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    const id = requestAnimationFrame(() => updateMenuPos());
    return () => cancelAnimationFrame(id);
  }, [menuOpen, updateMenuPos]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!menuRootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    window.addEventListener("resize", updateMenuPos);
    window.addEventListener("scroll", updateMenuPos, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("resize", updateMenuPos);
      window.removeEventListener("scroll", updateMenuPos, true);
    };
  }, [menuOpen, updateMenuPos]);

  const closeAnd = (fn: () => void) => {
    setMenuOpen(false);
    fn();
  };

  return (
    <div className="applications-table-row-actions flex items-center justify-center gap-0.5">
      <Link
        href={meta.profileHref}
        title="View candidate"
        aria-label="View candidate"
        className={APPLICATIONS_TABLE_ACTION_BTN}
      >
        <i className="ri-user-3-line text-[0.8125rem]" aria-hidden />
      </Link>
      <a
        href={meta.emailForMailto ? `mailto:${meta.emailForMailto}` : "#"}
        title={meta.emailForMailto ? "Send message" : "No public email on file"}
        aria-label="Send message"
        onClick={(e) => {
          if (!meta.emailForMailto) e.preventDefault();
        }}
        className={`${APPLICATIONS_TABLE_ACTION_BTN} ${meta.emailForMailto ? "" : "!opacity-40 pointer-events-none"}`}
      >
        <i className="ri-mail-line text-[0.8125rem]" aria-hidden />
      </a>
      <div ref={menuRootRef} className="relative">
        <button
          ref={menuBtnRef}
          type="button"
          className={APPLICATIONS_TABLE_ACTION_BTN}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={isUpdating}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <i className="ri-more-2-fill text-[0.8125rem]" aria-hidden />
        </button>
        {menuOpen && typeof document !== "undefined"
          ? createPortal(
              <ul
                ref={menuRef}
                className="fixed z-[12050] min-w-[11rem] max-w-[calc(100vw-1rem)] rounded-lg border border-defaultborder bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-bodybg"
                style={
                  menuPos
                    ? { top: menuPos.top, left: menuPos.left }
                    : { top: -9999, left: -9999, visibility: "hidden" }
                }
                role="menu"
              >
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={APPLICATIONS_ROW_MORE_MENU_ITEM}
                    disabled={isUpdating}
                    onClick={() => closeAnd(onRounds)}
                  >
                    <i className="ri-stack-line" aria-hidden />
                    Interview rounds
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={APPLICATIONS_ROW_MORE_MENU_ITEM}
                    disabled={isUpdating || scheduleBlocked}
                    title={scheduleTitle}
                    onClick={() => closeAnd(onSchedule)}
                  >
                    <i className="ri-calendar-event-line" aria-hidden />
                    Schedule interview
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={APPLICATIONS_ROW_MORE_MENU_ITEM_DANGER}
                    disabled={isUpdating || appStatus === "Rejected"}
                    onClick={() => closeAnd(onReject)}
                  >
                    <i className="ri-close-circle-line" aria-hidden />
                    Reject
                  </button>
                </li>
              </ul>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}

function ApplicationRowActions({
  meta,
  appStatus,
  isUpdating,
  onReject,
  onSchedule,
  onRounds,
  layout = "card",
}: {
  meta: ApplicationRowMeta;
  appStatus: JobApplicationStatus;
  isUpdating: boolean;
  onReject: () => void;
  onSchedule: () => void;
  onRounds: () => void;
  layout?: "card" | "table";
}) {
  const scheduleBlocked = isInterviewSchedulingBlocked(appStatus);
  const scheduleBlockMessage = getInterviewSchedulingBlockReason(appStatus);

  const cardIconClass =
    "inline-flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] w-11 h-11 sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded-md text-defaulttextcolor/50 hover:bg-primary/10 hover:text-primary";

  if (layout === "table") {
    const scheduleTitle = scheduleBlocked
      ? scheduleBlockMessage ?? "Schedule interview unavailable"
      : "Schedule interview";
    return (
      <ApplicationTableRowMoreMenu
        meta={meta}
        appStatus={appStatus}
        isUpdating={isUpdating}
        scheduleBlocked={scheduleBlocked}
        scheduleTitle={scheduleTitle}
        onReject={onReject}
        onSchedule={onSchedule}
        onRounds={onRounds}
      />
    );
  }

  return (
    <div className="applications-card-actions flex flex-wrap items-center gap-1 justify-between sm:justify-start w-full sm:w-auto">
      <Link
        href={meta.profileHref}
        title="View candidate"
        aria-label="View candidate"
        className={cardIconClass}
      >
        <i className="ri-user-3-line text-[0.875rem]" />
      </Link>
      <a
        href={meta.emailForMailto ? `mailto:${meta.emailForMailto}` : "#"}
        title={meta.emailForMailto ? "Send message" : "No public email on file"}
        aria-label="Send message"
        onClick={(e) => {
          if (!meta.emailForMailto) e.preventDefault();
        }}
        className={`${cardIconClass} ${meta.emailForMailto ? "" : "opacity-40 pointer-events-none"}`}
      >
        <i className="ri-mail-line text-[0.875rem]" />
      </a>
      <button
        type="button"
        title="Interview rounds"
        aria-label="Interview rounds"
        disabled={isUpdating}
        onClick={onRounds}
        className={`${cardIconClass} disabled:opacity-40`}
      >
        <i className="ri-stack-line text-[0.875rem]" />
      </button>
      <button
        type="button"
        title={scheduleBlocked ? scheduleBlockMessage ?? "Schedule interview unavailable" : "Schedule interview"}
        aria-label="Schedule interview"
        disabled={isUpdating || scheduleBlocked}
        onClick={onSchedule}
        className={`${cardIconClass} disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-defaulttextcolor/50 disabled:cursor-not-allowed`}
      >
        <i className="ri-calendar-event-line text-[0.875rem]" />
      </button>
      <button
        type="button"
        title="Reject"
        aria-label="Reject"
        disabled={isUpdating || appStatus === "Rejected"}
        onClick={onReject}
        className={`${cardIconClass} hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-defaulttextcolor/50`}
      >
        <i className="ri-close-circle-line text-[0.875rem]" />
      </button>
    </div>
  );
}

export default function ApplicationsPage() {
  const {
    containerRef: applicationsListContainerRef,
    showTable: showApplicationsTable,
    showCards: showApplicationsCards,
  } = useApplicationsListContainerLayout();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { confirm, confirmDialog } = useConfirm();
  const roundsCloseRef = useRef<HTMLButtonElement>(null);

  const initialFromUrl = readApplicationsFromQuery(searchParams);

  const [rows, setRows] = useState<ApplicationWithDocs[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [roundsPanelMeta, setRoundsPanelMeta] = useState<ApplicationRowMeta | null>(null);

  const [search, setSearch] = useState(initialFromUrl.q);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFromUrl.q);
  const [statusFilters, setStatusFilters] = useState<JobApplicationStatus[]>(initialFromUrl.stages);
  const [jobFilter, setJobFilter] = useState(initialFromUrl.jobId);
  const [departmentFilter, setDepartmentFilter] = useState(initialFromUrl.department);
  const [debouncedDepartment, setDebouncedDepartment] = useState(initialFromUrl.department);
  const [dateFrom, setDateFrom] = useState(initialFromUrl.dateFrom);
  const [dateTo, setDateTo] = useState(initialFromUrl.dateTo);
  const [sortBy, setSortBy] = useState(initialFromUrl.sortBy || DEFAULT_APPLICATION_SORT);

  const [page, setPage] = useState(initialFromUrl.page);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const fetchGenerationRef = useRef(0);
  const prevDebouncedSearchRef = useRef(debouncedSearch);
  const prevDebouncedDepartmentRef = useRef(debouncedDepartment);
  const didFitRefetchRef = useRef(false);

  const [jobOptions, setJobOptions] = useState<JobFilterOptionItem[]>([]);
  const [jobOptionsLoading, setJobOptionsLoading] = useState(false);
  const jobOptionsLoadedRef = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDepartment(departmentFilter.trim()), 300);
    return () => window.clearTimeout(t);
  }, [departmentFilter]);

  useEffect(() => {
    if (prevDebouncedSearchRef.current === debouncedSearch) return;
    prevDebouncedSearchRef.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (prevDebouncedDepartmentRef.current === debouncedDepartment) return;
    prevDebouncedDepartmentRef.current = debouncedDepartment;
    setPage(1);
  }, [debouncedDepartment]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    writeApplicationsToQuery(next, {
      page,
      q: search,
      stages: statusFilters,
      jobId: jobFilter,
      department: debouncedDepartment,
      dateFrom,
      dateTo,
      sortBy,
    });
    const qs = next.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    page,
    search,
    statusFilters,
    jobFilter,
    debouncedDepartment,
    dateFrom,
    dateTo,
    sortBy,
    pathname,
    router,
    searchParams,
  ]);

  const loadJobOptions = useCallback(async () => {
    if (jobOptionsLoadedRef.current) return;
    jobOptionsLoadedRef.current = true;
    setJobOptionsLoading(true);
    try {
      const options = await getJobFilterOptions();
      setJobOptions(options.jobs ?? []);
    } catch {
      jobOptionsLoadedRef.current = false;
      setJobOptions([]);
    } finally {
      setJobOptionsLoading(false);
    }
  }, []);

  const dateRangeIncompleteError = getYmdDateRangeIncompleteError(
    "Applied from",
    "Applied to",
    dateFrom,
    dateTo
  );

  const fetchApplications = useCallback((opts?: { silent?: boolean }) => {
    const generation = ++fetchGenerationRef.current;
    const incompleteMsg = getYmdDateRangeIncompleteError("Applied from", "Applied to", dateFrom, dateTo);
    if (incompleteMsg) {
      setListError(null);
      setRows([]);
      setTotalResults(0);
      setTotalPages(0);
      if (!opts?.silent) setLoading(false);
      return;
    }
    if (!opts?.silent) {
      setLoading(true);
      setListError(null);
    }
    const params: Parameters<typeof listJobApplications>[0] = {
      limit: LIST_PAGE_SIZE,
      page,
      sortBy,
      // Drop synthetic offer-letter placeholder applications from the recruiter dashboard.
      // They have no real applicant and surface as "Email hidden" rows otherwise.
      excludeInternal: true,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (statusFilters.length) params.statuses = statusFilters;
    if (jobFilter) params.jobId = jobFilter;
    if (debouncedDepartment) params.department = debouncedDepartment;
    if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      params.dateTo = to.toISOString();
    }

    listJobApplications(params)
      .then((res) => {
        if (generation !== fetchGenerationRef.current) return;
        // Backend dedupes per (job, applicant). Do not collapse the same person across jobs here.
        setRows((res.results ?? []) as ApplicationWithDocs[]);
        setTotalResults(res.totalResults ?? 0);
        setTotalPages(res.totalPages ?? 0);
        setListError(null);
      })
      .catch((err) => {
        if (generation !== fetchGenerationRef.current) return;
        console.error("[applications:list] request failed", {
          params,
          status: err?.response?.status,
          message: err?.response?.data?.message ?? err?.message,
        });
        setRows([]);
        setTotalResults(0);
        setTotalPages(0);
        setListError(getApiErrorMessage(err, "Could not load applications. Check your connection and try again."));
      })
      .finally(() => {
        if (generation === fetchGenerationRef.current && !opts?.silent) setLoading(false);
      });
  }, [page, sortBy, debouncedSearch, statusFilters, jobFilter, debouncedDepartment, dateFrom, dateTo]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchApplications();
  }, [user, fetchApplications]);

  /** Preline only binds dropdown toggles that exist during autoInit; table rows mount after fetch. */
  useEffect(() => {
    if (loading || !showApplicationsTable || rows.length === 0) return;
    const run = () => {
      try {
        (window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit?.();
      } catch {
        /* ignore */
      }
    };
    const stableRun = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(run);
      });
    };
    if (
      typeof window !== "undefined" &&
      (window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit
    ) {
      stableRun();
      return;
    }
    void import("preline/preline").then(stableRun);
  }, [loading, showApplicationsTable, rows.length, page]);

  useEffect(() => {
    didFitRefetchRef.current = false;
  }, [page, sortBy, debouncedSearch, statusFilters, jobFilter, debouncedDepartment, dateFrom, dateTo]);

  useEffect(() => {
    if (loading || didFitRefetchRef.current) return;
    const needsWarm = rows.some((row) => applicantFitNeedsWarm(row.applicantFit));
    if (!needsWarm) return;
    const timer = window.setTimeout(() => {
      didFitRefetchRef.current = true;
      fetchApplications({ silent: true });
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [loading, rows, fetchApplications]);

  const handleStatusChange = async (app: ApplicationWithDocs, next: JobApplicationStatus) => {
    const id = String(app._id ?? app.id ?? "");
    if (!id || app.status === next) return;
    setUpdatingId(id);
    setStatusError(null);
    try {
      const updated = await updateJobApplicationStatus(id, { status: next });
      setRows((prev) =>
        prev.map((r) =>
          String(r._id ?? r.id) === id ? ({ ...r, status: updated.status } as ApplicationWithDocs) : r,
        ),
      );
    } catch (err) {
      setStatusError(getApiErrorMessage(err, "Failed to update application status"));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectApplication = async (app: ApplicationWithDocs) => {
    const meta = getApplicationRowMeta(app);
    const ok = await confirm({
      title: "Reject application?",
      message: (
        <>
          {meta.name} will be moved to <strong>Rejected</strong>. They can be reopened to Applied,
          Screening, or Shortlisted later.
        </>
      ),
      tone: "danger",
      confirmLabel: "Reject",
    });
    if (!ok) return;
    await handleStatusChange(app, "Rejected");
  };

  const handleScheduleInterview = useCallback(
    (meta: ApplicationRowMeta) => {
      if (!meta.id) {
        router.push("/ats/interviews");
        return;
      }
      const params = new URLSearchParams();
      params.set("openSchedule", "1");
      params.set("applicationId", meta.id);
      if (meta.candidateId) params.set("candidateId", meta.candidateId);
      if (meta.jobId) params.set("jobId", meta.jobId);
      router.push(`/ats/interviews?${params.toString()}`);
    },
    [router],
  );

  const clearStatusFilters = () => {
    setStatusFilters([]);
    setPage(1);
  };

  const toggleStatusFilter = (status: JobApplicationStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((x) => x !== status) : [...prev, status]
    );
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilters([]);
    setJobFilter("");
    setDepartmentFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const dateRangeError = getReferralLeadsDateRangeError(dateFrom, dateTo);

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilters.length ? 1 : 0) +
    (jobFilter ? 1 : 0) +
    (departmentFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const panelFilterCount =
    (search ? 1 : 0) +
    (jobFilter ? 1 : 0) +
    (departmentFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const paginationTouchFriendly = useNarrowViewport(640);
  const narrowMobileFilters = useNarrowViewport(639);
  const searchPlaceholder = narrowMobileFilters
    ? "Search name, email, or job"
    : "Search by candidate name, email, or job title";

  if (!user) {
    return (
      <>
        <Seo title="Applications" />
        <div className="container-fluid pt-6">
          <div className="box custom-box">
            <div className="box-body text-center py-8">
              <p className="text-defaulttextcolor dark:text-white/70">Sign in to manage applications.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <Fragment>
      <Seo title="Applications" />
      <div className="applications-page-root container-fluid pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-defaulttextcolor dark:text-white tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
              Applications
              <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full text-xs font-medium bg-defaulttextcolor/10 dark:bg-white/10 text-defaulttextcolor dark:text-white/80">
                {loading ? "…" : totalResults}
              </span>
            </h1>
            <p className="text-[0.8125rem] sm:text-[0.75rem] text-defaulttextcolor/50 dark:text-white/50 mt-1">
              All candidate applications across every job in your ATS pipeline.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 min-w-0">
            <Link
              href="/ats/jobs"
              className="ti-btn ti-btn-light !py-2.5 sm:!py-1.5 !px-3 !text-xs !m-0 !font-medium justify-center min-h-[2.75rem] sm:min-h-0"
              aria-label="Back to jobs"
            >
              <i className="ri-briefcase-line align-middle sm:me-1" aria-hidden />
              <span className="hidden sm:inline">Jobs</span>
            </Link>
            <Link
              href="/ats/analytics"
              className="ti-btn ti-btn-primary !py-2.5 sm:!py-1.5 !px-3 !text-xs !m-0 !font-medium justify-center min-h-[2.75rem] sm:min-h-0"
              aria-label="View analytics"
            >
              <i className="ri-line-chart-line align-middle sm:me-1" aria-hidden />
              <span className="hidden sm:inline">Analytics</span>
            </Link>
          </div>
        </div>

        {/* Status pipeline strip */}
        <div className="box shrink-0">
          <div className="box-body !py-3 !px-3 sm:!px-4">
            <p
              id="applications-pipeline-label"
              className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50 mb-2 sm:sr-only"
            >
              Pipeline stage
            </p>
            <div className="applications-pipeline-scroll sm:overflow-visible sm:mx-0 sm:px-0">
              <div
                className="flex flex-nowrap sm:flex-wrap gap-2 w-max max-w-none sm:w-full sm:min-w-0"
                role="group"
                aria-labelledby="applications-pipeline-label"
              >
              <button
                type="button"
                onClick={clearStatusFilters}
                aria-pressed={statusFilters.length === 0}
                className={`shrink-0 text-xs px-3 py-2 sm:py-1.5 min-h-[2.5rem] sm:min-h-0 rounded-full border transition-colors ${
                  statusFilters.length === 0
                    ? "bg-primary/10 border-primary/30 text-primary dark:text-purple-300 font-semibold"
                    : "bg-transparent border-gray-200 dark:border-white/10 text-defaulttextcolor/50 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                All stages
              </button>
              {PIPELINE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatusFilter(s)}
                  aria-pressed={statusFilters.includes(s)}
                  className={`shrink-0 text-xs px-3 py-2 sm:py-1.5 min-h-[2.5rem] sm:min-h-0 rounded-full transition-colors ${
                    statusFilters.includes(s)
                      ? `${STATUS_STYLE[s]} font-semibold`
                      : "border border-gray-200 dark:border-white/10 text-defaulttextcolor/50 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {s}
                </button>
              ))}
              {statusFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearStatusFilters}
                  className="shrink-0 text-xs px-3 py-2 sm:py-1.5 min-h-[2.5rem] sm:min-h-0 rounded-full border border-gray-200 dark:border-white/10 text-primary dark:text-purple-300 hover:bg-primary/5 dark:hover:bg-primary/10"
                >
                  Clear stages
                </button>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="box shrink-0">
          <div className="box-body !p-3 sm:!p-4 space-y-3">
            <div>
              <label
                htmlFor={SEARCH_INPUT_ID}
                className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50 mb-1 block"
              >
                Search
              </label>
              <div className="flex items-center w-full rounded-sm border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors min-h-[2.75rem] sm:min-h-[2.125rem]">
                <i
                  aria-hidden
                  className="ri-search-line shrink-0 ms-3 me-2 text-[0.875rem] text-slate-400 dark:text-white/40"
                />
                <input
                  id={SEARCH_INPUT_ID}
                  name="q"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Search applications"
                  className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-xs sm:text-[0.8125rem] text-defaulttextcolor dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 pe-3"
                />
              </div>
            </div>

            <button
              type="button"
              className="xl:hidden flex items-center justify-between w-full rounded-md border border-defaultborder dark:border-defaultborder/10 px-3 py-2.5 min-h-[2.75rem] text-sm font-medium text-defaulttextcolor dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              onClick={() => setFiltersExpanded((open) => !open)}
              aria-expanded={filtersExpanded}
              aria-controls="applications-advanced-filters"
              aria-label="Filters, job and date options"
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <i className="ri-filter-3-line text-base shrink-0" aria-hidden />
                Filters
                {panelFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary">
                    {panelFilterCount}
                  </span>
                )}
              </span>
              <i className={`ri-arrow-${filtersExpanded ? "up" : "down"}-s-line text-lg shrink-0`} aria-hidden />
            </button>

            <div
              id="applications-advanced-filters"
              className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 items-end ${filtersExpanded ? "" : "hidden xl:grid"}`}
            >
              <div className="min-w-0">
                <label className={FILTER_LABEL} htmlFor="applications-job-filter">
                  Job
                </label>
                <select
                  id="applications-job-filter"
                  name="jobId"
                  value={jobFilter}
                  onFocus={() => {
                    void loadJobOptions();
                  }}
                  onChange={(e) => {
                    setJobFilter(e.target.value);
                    setPage(1);
                  }}
                  className={FILTER_SELECT}
                  aria-label="Filter by job"
                  aria-busy={jobOptionsLoading}
                >
                  <option value="">
                    {jobOptionsLoading ? "Loading jobs…" : "All jobs"}
                  </option>
                  {jobOptions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className={FILTER_LABEL} htmlFor="applications-department-filter">
                  Department
                </label>
                <input
                  id="applications-department-filter"
                  name="department"
                  type="text"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  placeholder="e.g. Engineering"
                  aria-label="Filter by department"
                  className={FILTER_INPUT}
                />
              </div>

              <YmdFilterDateInput
                label="Applied from"
                inputId={APPLIED_FROM_INPUT_ID}
                labelClassName={FILTER_LABEL}
                value={dateFrom}
                maxDate={dateTo || undefined}
                rangeError={dateRangeError}
                onCommit={(sanitized) => {
                  setDateFrom(sanitized);
                  setPage(1);
                  void alertYmdDateRangeIncomplete("Applied from", "Applied to", sanitized, dateTo);
                }}
                portalId="applications-datepicker-portal-from"
                popperClassName="!z-[9999]"
                wrapperClassName={FILTER_DATE_WRAPPER}
                inputClassName={FILTER_DATE_INPUT}
              />

              <YmdFilterDateInput
                label="Applied to"
                labelClassName={FILTER_LABEL}
                inputId={APPLIED_TO_INPUT_ID}
                value={dateTo}
                minDate={dateFrom || undefined}
                rangeError={dateRangeError}
                onCommit={(sanitized) => {
                  setDateTo(sanitized);
                  setPage(1);
                  void alertYmdDateRangeIncomplete("Applied from", "Applied to", dateFrom, sanitized);
                }}
                portalId="applications-datepicker-portal-to"
                popperClassName="!z-[9999]"
                wrapperClassName={FILTER_DATE_WRAPPER}
                inputClassName={FILTER_DATE_INPUT}
              />

              <div className="min-w-0">
                <label className={FILTER_LABEL} htmlFor="applications-sort-filter">
                  Sort
                </label>
                <select
                  id="applications-sort-filter"
                  name="sortBy"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className={FILTER_SELECT}
                  aria-label="Sort"
                >
                  <option value="createdAt:desc">Newest</option>
                  <option value="createdAt:asc">Oldest</option>
                  <option value="updatedAt:desc">Recently updated</option>
                  <option value="status:asc">Status (A–Z)</option>
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-defaultborder/60 dark:border-white/10 xl:border-0 xl:pt-0">
                <span className="text-defaulttextcolor/50 dark:text-white/50">
                  {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                </span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-primary hover:underline font-medium"
                >
                  Clear all
                </button>
              </div>
            )}

            {dateRangeIncompleteError ? (
              <p className="text-sm text-danger m-0 pt-1" role="alert">
                {dateRangeIncompleteError}
              </p>
            ) : null}
          </div>
        </div>

        {statusError ? (
          <div
            className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger flex flex-wrap items-center justify-between gap-2"
            role="alert"
          >
            <span>{statusError}</span>
            <button
              type="button"
              className="text-xs font-medium underline"
              onClick={() => setStatusError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Applications list */}
        <div className="box mb-0 flex min-h-0 flex-1 flex-col">
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {!loading && !listError && !dateRangeIncompleteError
              ? `${totalResults} application${totalResults === 1 ? "" : "s"}`
              : ""}
          </p>
          <div
            className="box-body !p-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            aria-busy={loading}
            aria-label="Applications list"
          >
            {loading ? (
              <div
                ref={applicationsListContainerRef}
                className="applications-list-container flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden"
              >
                {showApplicationsCards ? (
                  <div className="applications-list-cards min-h-0 flex-1 divide-y-0 sm:divide-y divide-gray-200 dark:divide-white/10">
                    {[...Array(4)].map((_, i) => (
                      <div key={`m-sk-${i}`} className="p-4">
                        <div className={`h-5 w-2/3 mb-2 ${SKELETON_PULSE}`} />
                        <div className={`h-4 w-1/2 ${SKELETON_PULSE}`} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {showApplicationsTable ? (
                  <div className="applications-table-scroll table-responsive min-h-0 flex-1 overflow-y-auto">
                    <table className="applications-data-table table table-hover table-bordered w-full text-sm">
                      <tbody>
                        {[...Array(6)].map((_, i) => (
                          <tr key={`s-${i}`} className="border border-inherit border-solid dark:border-defaultborder/10">
                            <td colSpan={9} className="!py-3">
                              <div className={`h-5 w-full ${SKELETON_PULSE}`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : listError ? (
              <div className="!text-center !py-12 px-4" role="alert">
                <div className="flex flex-col items-center gap-3">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 text-danger">
                    <i className="ri-error-warning-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="font-semibold text-defaulttextcolor dark:text-white">Could not load applications</p>
                  <p className="text-[0.75rem] text-defaulttextcolor/60 dark:text-white/50 max-w-md">{listError}</p>
                  <button
                    type="button"
                    onClick={() => fetchApplications()}
                    className="ti-btn ti-btn-primary !text-xs !py-2 !px-4 !m-0 inline-flex min-h-[2.75rem] items-center gap-1.5"
                  >
                    <i className="ri-refresh-line" aria-hidden />
                    Retry
                  </button>
                </div>
              </div>
            ) : dateRangeIncompleteError ? (
              <div className="!text-center !py-12 px-4" role="alert">
                <p className="font-semibold text-defaulttextcolor dark:text-white">Complete the date range</p>
                <p className="text-[0.75rem] text-defaulttextcolor/60 dark:text-white/50 mt-1 max-w-md mx-auto">
                  {dateRangeIncompleteError}
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="!text-center !py-12 px-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 text-primary">
                    <i className="ri-file-search-line text-[1.25rem]" />
                  </span>
                  <p className="font-semibold text-defaulttextcolor dark:text-white">No applications found</p>
                  <p className="text-[0.75rem] text-defaulttextcolor/50 dark:text-white/50">
                    {activeFilterCount > 0 ? "Try adjusting your filters." : "New candidate applications will appear here."}
                  </p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-primary hover:underline text-xs mt-1">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                ref={applicationsListContainerRef}
                className="applications-list-container flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden"
              >
                {showApplicationsCards ? (
                <div className="applications-list-cards min-h-0 flex-1 divide-y-0 sm:divide-y divide-gray-200 dark:divide-white/10">
                  {rows.map((app) => {
                    const meta = getApplicationRowMeta(app);
                    const isUpdating = updatingId === meta.id;
                    return (
                      <article
                        key={meta.id}
                        className="applications-list-card p-3.5 sm:p-4 space-y-2.5 min-w-0 rounded-xl border border-defaultborder/70 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <ApplicationApplicantAvatar name={meta.name} photoUrl={meta.profilePhotoUrl} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={meta.profileHref}
                                  className="font-semibold text-sm text-defaulttextcolor dark:text-white hover:text-primary block truncate leading-snug"
                                >
                                  {meta.name}
                                </Link>
                                <span className="text-[0.6875rem] text-defaulttextcolor/60 dark:text-white/60 block truncate">
                                  {meta.emailDisplay}
                                </span>
                                <ApplicantTypeBadge isEmployee={meta.isEmployee} />
                              </div>
                              <div className="shrink-0 w-[min(100%,9.5rem)] max-w-[45%] sm:max-w-none">
                                <ApplicationStatusSelect
                                  controlId={`application-status-${meta.id}`}
                                  value={app.status}
                                  applicantName={meta.name}
                                  disabled={isUpdating}
                                  onChange={(next) => handleStatusChange(app, next)}
                                  compact
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 text-xs">
                          <span className="font-medium text-defaulttextcolor dark:text-white block break-words [overflow-wrap:anywhere]" title={meta.jobTitle}>
                            {meta.jobTitle}
                          </span>
                          {(() => {
                            const orgLine = jobOrganisationSubtitle(meta.jobTitle, meta.orgName);
                            return orgLine ? (
                              <span className="text-[0.6875rem] text-defaulttextcolor/60 dark:text-white/60 block truncate" title={orgLine}>
                                {orgLine}
                              </span>
                            ) : null;
                          })()}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.6875rem] text-defaulttextcolor/65 dark:text-white/60">
                            <span>
                              <span className="text-defaulttextcolor/55 dark:text-white/70">Applied </span>
                              {formatDate(meta.appliedAt)}
                            </span>
                            {meta.dept && meta.dept !== "—" ? (
                              <span className="min-w-0 truncate" title={meta.dept}>
                                <span className="text-defaulttextcolor/55 dark:text-white/70">Dept </span>
                                {meta.dept}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <ApplicantFitChips fit={app.applicantFit} />
                        <div className="space-y-2 pt-2 border-t border-defaultborder/40 dark:border-white/10">
                          <ApplicationRowActions
                            meta={meta}
                            appStatus={app.status}
                            isUpdating={isUpdating}
                            onReject={() => void handleRejectApplication(app)}
                            onSchedule={() => handleScheduleInterview(meta)}
                            onRounds={() => setRoundsPanelMeta(meta)}
                          />
                          <ApplicationDocLinks
                            resume={meta.resumeLink}
                            coverLetter={meta.coverLetterLink}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
                ) : null}

                {showApplicationsTable ? (
                <div className="applications-table-scroll table-responsive min-h-0 flex-1 overflow-y-auto">
                  <table className="applications-data-table table table-hover table-bordered w-full">
                    <colgroup>
                      <col className={APP_COL.applicant} />
                      <col className={APP_COL.job} />
                      <col className={APP_COL.department} />
                      <col className={APP_COL.status} />
                      <col className={APP_COL.success} />
                      <col className={APP_COL.culture} />
                      <col className={APP_COL.applied} />
                      <col className={APP_COL.documents} />
                      <col className={APP_COL.actions} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col" className={`!text-start ${APP_COL.applicant}`}>Applicant</th>
                        <th scope="col" className={`!text-start ${APP_COL.job}`}>Applied Job</th>
                        <th scope="col" className={`!text-start ${APP_COL.department}`}>Department</th>
                        <th scope="col" className={`!text-start ${APP_COL.status}`}>Status</th>
                        <th scope="col" className={`!text-start whitespace-nowrap ${APP_COL.success}`}>
                          <ApplicantFitColumnHeader kind="success" />
                        </th>
                        <th scope="col" className={`!text-start whitespace-nowrap ${APP_COL.culture}`}>
                          <ApplicantFitColumnHeader kind="culture" />
                        </th>
                        <th scope="col" className={`!text-start whitespace-nowrap ${APP_COL.applied}`}>Applied Date</th>
                        <th scope="col" className={`!text-start whitespace-nowrap ${APP_COL.documents}`}>Documents</th>
                        <th scope="col" className={`!text-center ${APP_COL.actions}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((app) => {
                        const meta = getApplicationRowMeta(app);
                        const isUpdating = updatingId === meta.id;
                        return (
                          <tr
                            key={meta.id}
                            className="border border-inherit border-solid hover:bg-gray-50 dark:hover:bg-white/5 dark:border-defaultborder/10"
                          >
                            <td className={`align-middle ${APP_COL.applicant}`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ApplicationApplicantAvatar name={meta.name} photoUrl={meta.profilePhotoUrl} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Link
                                      href={meta.profileHref}
                                      className="font-semibold text-defaulttextcolor dark:text-white hover:text-primary truncate min-w-0"
                                      title={meta.name}
                                    >
                                      {meta.name}
                                    </Link>
                                    <ApplicantTypeBadge isEmployee={meta.isEmployee} inline />
                                  </div>
                                  <span
                                    className="text-[0.6875rem] text-defaulttextcolor/60 dark:text-white/60 truncate block"
                                    title={meta.emailDisplay}
                                  >
                                    {meta.emailDisplay}
                                  </span>
                                  <span
                                    className="applications-applicant-applied-meta text-[0.6875rem] text-defaulttextcolor/60 dark:text-white/70 truncate block"
                                    title={meta.appliedAt ?? ""}
                                  >
                                    Applied {formatDate(meta.appliedAt)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className={`align-middle min-w-0 ${APP_COL.job}`}>
                              <span
                                className="block truncate min-w-0 font-medium text-defaulttextcolor dark:text-white/90"
                                title={meta.jobTitle}
                              >
                                {meta.jobTitle}
                              </span>
                              {(() => {
                                const orgLine = jobOrganisationSubtitle(meta.jobTitle, meta.orgName);
                                return orgLine ? (
                                  <span
                                    className="applications-job-org-meta block text-[0.6875rem] text-defaulttextcolor/60 dark:text-white/60 truncate min-w-0"
                                    title={orgLine}
                                  >
                                    {orgLine}
                                  </span>
                                ) : null;
                              })()}
                            </td>
                            <td className={`align-middle truncate ${APP_COL.department}`}>
                              <span className="text-defaulttextcolor/60 dark:text-white/70" title={meta.dept}>
                                {meta.dept}
                              </span>
                            </td>
                            <td className={`align-middle !whitespace-normal ${APP_COL.status}`}>
                              <ApplicationStatusSelect
                                controlId={`application-status-${meta.id}`}
                                value={app.status}
                                applicantName={meta.name}
                                disabled={isUpdating}
                                onChange={(next) => handleStatusChange(app, next)}
                                compact
                              />
                            </td>
                            <td className={`align-middle whitespace-nowrap ${APP_COL.success}`}>
                              <SuccessProbabilityCell fit={app.applicantFit} dense />
                            </td>
                            <td className={`align-middle whitespace-nowrap ${APP_COL.culture}`}>
                              <CulturalFitCell fit={app.applicantFit} dense />
                            </td>
                            <td className={`align-middle whitespace-nowrap ${APP_COL.applied}`}>
                              <span title={meta.appliedAt ?? ""}>{formatDate(meta.appliedAt)}</span>
                            </td>
                            <td className={`align-middle whitespace-nowrap ${APP_COL.documents}`}>
                              <ApplicationDocLinks
                                resume={meta.resumeLink}
                                coverLetter={meta.coverLetterLink}
                                compact
                              />
                            </td>
                            <td className={`!text-center align-middle whitespace-nowrap ${APP_COL.actions}`}>
                              <ApplicationRowActions
                                layout="table"
                                meta={meta}
                                appStatus={app.status}
                                isUpdating={isUpdating}
                                onReject={() => void handleRejectApplication(app)}
                                onSchedule={() => handleScheduleInterview(meta)}
                                onRounds={() => setRoundsPanelMeta(meta)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                ) : null}
              </div>
            )}
          </div>
          {loading || listError || dateRangeIncompleteError ? null : (
            <div className="box-footer applications-list-footer shrink-0 !px-3 sm:!px-4 min-w-0">
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={LIST_PAGE_SIZE}
                onPageChange={setPage}
                ariaLabel="Applications page navigation"
                gotoInputId="applications-goto-page"
                hideWhenSinglePage
                touchFriendly={paginationTouchFriendly}
                showPageSize={false}
                className="applications-list-pagination"
              />
            </div>
          )}
        </div>
      </div>

      <SimpleModal
        open={Boolean(roundsPanelMeta)}
        onClose={() => setRoundsPanelMeta(null)}
        ariaLabel="Interview rounds"
        panelClassName="bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        initialFocusRef={roundsCloseRef}
      >
        {roundsPanelMeta ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 px-4 py-3 shrink-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Interview rounds</h3>
              <button
                ref={roundsCloseRef}
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-defaulttextcolor/50 hover:bg-gray-100 dark:hover:bg-white/10"
                aria-label="Close"
                onClick={() => setRoundsPanelMeta(null)}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
              <RoundHistoryPanel
                applicationId={roundsPanelMeta.id}
                candidateName={roundsPanelMeta.name}
                jobTitle={roundsPanelMeta.jobTitle}
              />
            </div>
          </>
        ) : null}
      </SimpleModal>

      {confirmDialog}
      <ApplicantFitInfoDrawer />
    </Fragment>
  );
}
