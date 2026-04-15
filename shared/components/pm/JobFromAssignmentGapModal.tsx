"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  generateAssignmentRowJobDraft,
  type RecommendedJobDraft,
} from "@/shared/lib/api/pmAssistant";
import { createJob, type CreateJobPayload } from "@/shared/lib/api/jobs";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Map draft / free-text seniority to ATS experience level (same buckets as create job). */
function seniorityToExperienceLevel(s: string): NonNullable<CreateJobPayload["experienceLevel"]> {
  const x = s.toLowerCase();
  if (/entry|junior|intern|graduate|associate\s*1/.test(x)) return "Entry Level";
  if (/exec|director|vp|head\s+of|c-level|chief/.test(x)) return "Executive";
  if (/senior|lead|principal|staff|sr\.?/.test(x)) return "Senior Level";
  return "Mid Level";
}

const ATS_EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Executive"] as const;
type AtsExperienceLevel = (typeof ATS_EXPERIENCE_LEVELS)[number];

/** One explicit "Remote"; "To be determined" replaces the old "Remote / TBD" so the list does not read like two remotes. */
const LOCATION_PRESETS = ["To be determined", "Remote", "Hybrid", "On-site"] as const;
type LocationPreset = (typeof LOCATION_PRESETS)[number] | "__custom__";

function resolvePostedLocation(preset: LocationPreset, custom: string): string {
  if (preset === "__custom__") return custom.trim();
  return preset;
}

function buildIntroLine(projectName: string, taskTitle: string): string {
  const p = projectName.trim() || "this project";
  const t = taskTitle.trim() || "a project task";
  return `Internal opportunity on “${p}” — supporting “${t}”. Edit this intro as needed.`;
}

function draftToJobDescriptionHtml(intro: string, outline: string, skills: string[]): string {
  const introP = intro.trim() ? `<p>${escapeHtml(intro.trim())}</p>` : "";
  const paras = outline
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const li = skills.map((t) => `<li>${escapeHtml(t.trim())}</li>`).join("");
  const list = li ? `<h3>Must-have skills</h3><ul>${li}</ul>` : "";
  return `${introP}${paras}${list}`;
}

const JOB_TYPES: CreateJobPayload["jobType"][] = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
];

/** Common ISO 4217 codes for salary (preset dropdown + Other…, same pattern as Location). */
const SALARY_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AUD",
  "CAD",
  "CHF",
  "JPY",
  "CNY",
  "SGD",
  "NZD",
  "AED",
  "SAR",
  "SEK",
  "NOK",
  "DKK",
  "ZAR",
  "MXN",
  "BRL",
  "PLN",
  "HKD",
  "KRW",
  "TRY",
  "IDR",
  "PHP",
  "THB",
  "MYR",
  "VND",
  "ILS",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "PKR",
  "BDT",
  "EGP",
  "NGN",
  "KES",
  "GHS",
] as const;

type SalaryCurrencyCode = (typeof SALARY_CURRENCY_CODES)[number];
type CurrencyPreset = SalaryCurrencyCode | "__custom__";

function resolvePostedCurrency(preset: CurrencyPreset, custom: string): string {
  if (preset === "__custom__") return custom.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8);
  return preset;
}

/** Optional salary row: omit from payload when both min and max are empty. */
function parseOptionalSalaryRange(
  minStr: string,
  maxStr: string,
  currency: string
): { range: CreateJobPayload["salaryRange"]; error?: string } {
  const minT = minStr.trim();
  const maxT = maxStr.trim();
  if (!minT && !maxT) return { range: undefined };
  const minNum = minT ? Number(minT.replace(/,/g, "")) : NaN;
  const maxNum = maxT ? Number(maxT.replace(/,/g, "")) : NaN;
  if (minT && Number.isNaN(minNum)) return { range: undefined, error: "Salary minimum must be a valid number." };
  if (maxT && Number.isNaN(maxNum)) return { range: undefined, error: "Salary maximum must be a valid number." };
  const min = minT ? minNum : null;
  const max = maxT ? maxNum : null;
  if (min != null && max != null && min > max) {
    return { range: undefined, error: "Salary minimum cannot be greater than maximum." };
  }
  const cur = (currency.trim() || "USD").slice(0, 8);
  return {
    range: {
      min: min ?? null,
      max: max ?? null,
      currency: cur,
    },
  };
}

export type JobFromAssignmentGapModalProps = {
  open: boolean;
  onClose: () => void;
  runId: string;
  rowId: string;
  taskTitle: string;
  /** When null, modal fetches draft from PM assistant on open. */
  seedDraft: RecommendedJobDraft | null;
  projectName: string;
  projectManager?: string;
  clientStakeholder?: string;
  hasJobsManage: boolean;
};

export function JobFromAssignmentGapModal({
  open,
  onClose,
  runId,
  rowId,
  taskTitle,
  seedDraft,
  projectName,
  projectManager,
  clientStakeholder,
  hasJobsManage,
}: JobFromAssignmentGapModalProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const [intro, setIntro] = useState("");
  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<AtsExperienceLevel>("Mid Level");
  const [orgName, setOrgName] = useState("");
  const [locationPreset, setLocationPreset] = useState<LocationPreset>("To be determined");
  const [locationCustom, setLocationCustom] = useState("");
  const [jobType, setJobType] = useState<CreateJobPayload["jobType"]>("Full-time");
  const [publishActive, setPublishActive] = useState(false);
  const [salaryMinStr, setSalaryMinStr] = useState("");
  const [salaryMaxStr, setSalaryMaxStr] = useState("");
  const [currencyPreset, setCurrencyPreset] = useState<CurrencyPreset>("USD");
  const [currencyCustom, setCurrencyCustom] = useState("");

  const applyDraftFields = useCallback((d: RecommendedJobDraft) => {
    setTitle(d.title);
    setOutline(d.descriptionOutline);
    setSkillsText((d.mustHaveSkills || []).join(", "));
    setExperienceLevel(seniorityToExperienceLevel(d.seniority || ""));
    setIntro(buildIntroLine(projectName, taskTitle));
    setOrgName(projectName.trim() ? `Internal — ${projectName.trim()}` : "Internal");
  }, [projectName, taskTitle]);

  useEffect(() => {
    if (!open) {
      setLoadError(null);
      setPostError(null);
      setBusy(false);
      return;
    }
    setLocationPreset("To be determined");
    setLocationCustom("");
    setJobType("Full-time");
    setSalaryMinStr("");
    setSalaryMaxStr("");
    setCurrencyPreset("USD");
    setCurrencyCustom("");
    setPublishActive(false);
    setLoadError(null);
    setPostError(null);
    if (seedDraft) {
      applyDraftFields(seedDraft);
      return;
    }
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const res = await generateAssignmentRowJobDraft(runId, rowId, { force: false });
        if (cancelled) return;
        applyDraftFields(res.recommendedJobDraft);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e && typeof e === "object" && "response" in e
            ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        setLoadError(typeof msg === "string" ? msg : "Could not generate job draft.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, runId, rowId, seedDraft, applyDraftFields]);

  useEffect(() => {
    if (!open || busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const handleRegenerate = async () => {
    setPostError(null);
    setLoadError(null);
    setBusy(true);
    try {
      const res = await generateAssignmentRowJobDraft(runId, rowId, { force: true });
      applyDraftFields(res.recommendedJobDraft);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setLoadError(typeof msg === "string" ? msg : "Regenerate failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePost = async () => {
    setPostError(null);
    if (!hasJobsManage) {
      setPostError("You need jobs.manage permission to post jobs.");
      return;
    }
    const org = orgName.trim();
    if (!org) {
      setPostError("Organisation name is required.");
      return;
    }
    const t = title.trim();
    if (!t) {
      setPostError("Job title is required.");
      return;
    }
    const skills = skillsText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const desc = draftToJobDescriptionHtml(intro, outline, skills);
    if (!desc.replace(/<[^>]+>/g, "").trim()) {
      setPostError("Job description is empty.");
      return;
    }
    if (locationPreset === "__custom__" && !locationCustom.trim()) {
      setPostError("Enter a location when you choose Other...");
      return;
    }
    const resolvedCurrency = resolvePostedCurrency(currencyPreset, currencyCustom);
    const hasSalaryIntent = Boolean(salaryMinStr.trim() || salaryMaxStr.trim());
    if (hasSalaryIntent && currencyPreset === "__custom__" && !resolvedCurrency) {
      setPostError("Enter a currency code when you choose Other...");
      return;
    }
    const { range: salaryRange, error: salaryErr } = parseOptionalSalaryRange(
      salaryMinStr,
      salaryMaxStr,
      resolvedCurrency || "USD"
    );
    if (salaryErr) {
      setPostError(salaryErr);
      return;
    }
    const payload: CreateJobPayload = {
      title: t,
      organisation: {
        name: org,
        website: "",
        email: "",
        phone: "",
        address: "",
        description: [projectManager, clientStakeholder].filter(Boolean).join(" · ") || undefined,
      },
      jobDescription: desc,
      jobType,
      location: resolvePostedLocation(locationPreset, locationCustom),
      skillTags: skills.length ? skills : undefined,
      experienceLevel,
      status: publishActive ? "Active" : "Draft",
      ...(salaryRange ? { salaryRange } : {}),
    };
    setBusy(true);
    try {
      const job = await createJob(payload);
      const jid = String(job._id ?? job.id ?? "");
      await Swal.fire({
        icon: "success",
        title: publishActive ? "Job published" : "Draft saved",
        text: jid ? "Continue to edit this job in ATS, or stay on the assignment page." : "Job created.",
      });
      onClose();
      if (jid) router.push(`/ats/jobs/edit/${jid}`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setPostError(typeof msg === "string" ? msg : "Could not create job.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const ctxLines = [projectName, taskTitle].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pm-job-gap-title"
      aria-busy={busy}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
        aria-label="Close dialog"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-defaultborder/80 bg-bodybg shadow-2xl dark:border-white/10 motion-safe:animate-pm-panel-in motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/95 to-white px-4 py-3 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id="pm-job-gap-title" className="m-0 text-[1.05rem] font-semibold text-defaulttextcolor">
              Internal job from assignment gap
            </h2>
            <p className="mb-0 mt-1 text-start text-[0.72rem] leading-snug text-slate-500 dark:text-white/55">
              {ctxLines.map((line, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? " · " : null}
                  {line}
                </React.Fragment>
              ))}
            </p>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-light !mb-0 shrink-0 rounded-xl !py-1.5 !px-2.5"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {loadError ? (
            <p className="mb-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[0.8125rem] text-danger" role="alert">
              {loadError}
            </p>
          ) : null}

          {busy && !seedDraft && !title ? (
            <p className="mb-3 text-[0.8125rem] text-muted" role="status">
              Generating draft…
            </p>
          ) : null}

          <div className="space-y-3 text-[0.8125rem]">
              <div>
                <label className="mb-1 block font-semibold text-defaulttextcolor" htmlFor="pm-job-intro">
                  Internal intro <span className="font-normal text-muted">(editable)</span>
                </label>
                <textarea
                  id="pm-job-intro"
                  className="form-control min-h-[72px] resize-y"
                  value={intro}
                  onChange={(e) => setIntro(e.target.value.slice(0, 2000))}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold" htmlFor="pm-job-title">
                  Job title
                </label>
                <input
                  id="pm-job-title"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold" htmlFor="pm-job-outline">
                  Description <span className="font-normal text-muted">(plain text, line breaks ok)</span>
                </label>
                <textarea
                  id="pm-job-outline"
                  className="form-control min-h-[140px] resize-y"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value.slice(0, 12000))}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold" htmlFor="pm-job-skills">
                  Skills <span className="font-normal text-muted">(comma-separated)</span>
                </label>
                <textarea
                  id="pm-job-skills"
                  className="form-control min-h-[64px] resize-y"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value.slice(0, 4000))}
                  disabled={busy}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold" htmlFor="pm-job-exp-level">
                    Experience level
                  </label>
                  <select
                    id="pm-job-exp-level"
                    className="form-control text-defaulttextcolor"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as AtsExperienceLevel)}
                    disabled={busy}
                    spellCheck={false}
                    autoComplete="off"
                  >
                    {ATS_EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                  <p className="mb-0 mt-1 text-[0.7rem] text-muted">
                    Same choices as ATS → Create job. Draft seniority picks a default you can change here.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block font-semibold" htmlFor="pm-job-location-preset">
                    Location
                  </label>
                  <select
                    id="pm-job-location-preset"
                    className="form-control text-defaulttextcolor"
                    value={locationPreset}
                    onChange={(e) => setLocationPreset(e.target.value as LocationPreset)}
                    disabled={busy}
                    spellCheck={false}
                    autoComplete="off"
                  >
                    {LOCATION_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="__custom__">Other...</option>
                  </select>
                  {locationPreset === "__custom__" ? (
                    <>
                      <label className="mb-1 mt-2 block text-[0.72rem] font-medium text-muted" htmlFor="pm-job-location-custom">
                        City, region, or details
                      </label>
                      <input
                        id="pm-job-location-custom"
                        type="text"
                        className="form-control"
                        placeholder="e.g. London, UK or Remote — EU timezone"
                        value={locationCustom}
                        onChange={(e) => setLocationCustom(e.target.value.slice(0, 200))}
                        disabled={busy}
                      />
                    </>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold" htmlFor="pm-job-org">
                    Organisation name
                  </label>
                  <input
                    id="pm-job-org"
                    className="form-control"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value.slice(0, 200))}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold" htmlFor="pm-job-type">
                    Job type
                  </label>
                  <select
                    id="pm-job-type"
                    className="form-control text-defaulttextcolor"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as CreateJobPayload["jobType"])}
                    disabled={busy}
                    spellCheck={false}
                    autoComplete="off"
                  >
                    {JOB_TYPES.map((jt) => (
                      <option key={jt} value={jt}>
                        {jt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-defaulttextcolor">
                  Salary range <span className="font-normal text-muted">(optional)</span>
                </label>
                <p className="mb-2 text-[0.7rem] text-muted">
                  Leave blank if pay is undecided or set internally later — same as ATS Create job.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[0.72rem] font-medium text-muted" htmlFor="pm-job-sal-min">
                      Minimum
                    </label>
                    <input
                      id="pm-job-sal-min"
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="e.g. 80000"
                      value={salaryMinStr}
                      onChange={(e) => setSalaryMinStr(e.target.value.slice(0, 24))}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.72rem] font-medium text-muted" htmlFor="pm-job-sal-max">
                      Maximum
                    </label>
                    <input
                      id="pm-job-sal-max"
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="e.g. 120000"
                      value={salaryMaxStr}
                      onChange={(e) => setSalaryMaxStr(e.target.value.slice(0, 24))}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.72rem] font-medium text-muted" htmlFor="pm-job-sal-cur">
                      Currency
                    </label>
                    <select
                      id="pm-job-sal-cur"
                      className="form-control text-defaulttextcolor"
                      value={currencyPreset}
                      onChange={(e) => setCurrencyPreset(e.target.value as CurrencyPreset)}
                      disabled={busy}
                      spellCheck={false}
                      autoComplete="off"
                    >
                      {SALARY_CURRENCY_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                      <option value="__custom__">Other...</option>
                    </select>
                    {currencyPreset === "__custom__" ? (
                      <>
                        <label className="mb-1 mt-2 block text-[0.72rem] font-medium text-muted" htmlFor="pm-job-sal-cur-custom">
                          ISO code
                        </label>
                        <input
                          id="pm-job-sal-cur-custom"
                          type="text"
                          className="form-control text-defaulttextcolor"
                          placeholder="e.g. DKK"
                          value={currencyCustom}
                          onChange={(e) =>
                            setCurrencyCustom(e.target.value.toUpperCase().replace(/[^A-Za-z]/g, "").slice(0, 8))
                          }
                          disabled={busy}
                          spellCheck={false}
                          autoCapitalize="characters"
                          autoComplete="off"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={publishActive}
                  onChange={(e) => setPublishActive(e.target.checked)}
                  disabled={busy || !hasJobsManage}
                />
                <span>Publish as Active (otherwise save as Draft)</span>
              </label>
            </div>

          {postError ? (
            <p className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[0.8125rem] text-danger" role="alert">
              {postError}
            </p>
          ) : null}

          {!hasJobsManage ? (
            <p className="mt-3 text-[0.78rem] text-muted">
              You can preview and regenerate drafts. Posting to ATS requires{" "}
              <strong>jobs.manage</strong> — ask an admin if you need access.
            </p>
          ) : null}

          <p className="mt-3 text-[0.7rem] text-muted dark:text-white/45">
            Jobs are created as internal listings (same as ATS → Create job).{" "}
            <Link href="/ats/jobs" className="text-primary underline">
              Open jobs
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-defaultborder/60 bg-[rgb(var(--default-background))]/40 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <button type="button" className="ti-btn ti-btn-light !mb-0 w-full sm:w-auto" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <button
              type="button"
              className="ti-btn ti-btn-outline-primary !mb-0 w-full sm:w-auto"
              onClick={() => void handleRegenerate()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <i className="ri-loader-4-line me-1 inline-block animate-spin motion-reduce:animate-none" aria-hidden />
                  Working…
                </>
              ) : (
                <>
                  <i className="ri-refresh-line me-1" aria-hidden />
                  Regenerate draft
                </>
              )}
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary !mb-0 w-full sm:w-auto"
              onClick={() => void handlePost()}
              disabled={busy || !hasJobsManage}
            >
              {busy ? (
                <>
                  <i className="ri-loader-4-line me-1 inline-block animate-spin motion-reduce:animate-none" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <i className="ri-send-plane-line me-1" aria-hidden />
                  {publishActive ? "Post to ATS" : "Save draft to ATS"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
