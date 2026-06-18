"use client";

import React, { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";

// Match the create/edit pages: both react-select entry points dynamic + ssr:false
// to keep the chunk graph consistent (Turbopack is sensitive to mixed boundaries).
const Select = dynamic(() => import("react-select"), { ssr: false });
const CreatableSelect = dynamic(() => import("react-select/creatable"), { ssr: false });

type SelectOption = { value: string; label: string };
import { ROUTES } from "@/shared/lib/constants";
import {
  hasJobsManageAccess,
  hasJobsReadAccess,
  hasSettingsFeatureAccess,
  hasSettingsFeatureAction,
} from "@/shared/lib/permissions";
import { useAuth } from "@/shared/contexts/auth-context";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import {
  createJobTemplate,
  deleteJobTemplate,
  getJobTemplate,
  listJobTemplates,
  updateJobTemplate,
  type JobTemplate,
  type JobTemplateVisibility,
} from "@/shared/lib/api/jobs";
import DOMPurify from "isomorphic-dompurify";
import { normalizeTipTapHtmlFromApi } from "@/shared/lib/tiptapHtml";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

function formatTs(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function templateKey(t: JobTemplate): string {
  const id = "_id" in t && (t as { _id?: string })._id ? (t as { _id?: string })._id : "";
  const alt = "id" in t && (t as { id?: string }).id ? (t as { id?: string }).id : "";
  return String(id || alt || "");
}

export default function SettingsJobTemplatesPage() {
  const router = useRouter();
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } = usePmReactSelectStyles(9999);
  const { permissions, permissionsLoaded } = useAuth();
  const raw = permissions ?? [];
  const matrixWrite =
    ["create", "edit", "delete"].some((action) =>
      hasSettingsFeatureAction(raw, "job-templates", action as "create" | "edit" | "delete"),
    );
  const canView = hasJobsReadAccess(raw) || hasSettingsFeatureAccess(raw, "job-templates");
  /** Prefer `jobs.manage` / ATS write; optionally also `settings.job-templates:*` writes. */
  const canManage = hasJobsManageAccess(raw) || matrixWrite;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<JobTemplate[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formVisibility, setFormVisibility] = useState<JobTemplateVisibility>("public");
  // Optional structured defaults — same option types/shape as ATS Create / Edit Job.
  const [formJobType, setFormJobType] = useState<SelectOption | null>(null);
  const [formExperienceLevel, setFormExperienceLevel] = useState<SelectOption | null>(null);
  const [formLocation, setFormLocation] = useState<string>("");
  const [formSalaryMin, setFormSalaryMin] = useState<string>("");
  const [formSalaryMax, setFormSalaryMax] = useState<string>("");
  const [formSalaryCurrency, setFormSalaryCurrency] = useState<string>("USD");
  const [formSkills, setFormSkills] = useState<SelectOption[]>([]);
  const [formSkillsInputValue, setFormSkillsInputValue] = useState<string>("");
  const [formEducation, setFormEducation] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Match values + labels used by ATS Create / Edit Job (label != value for jobType).
  const jobTypeOptions: SelectOption[] = [
    { value: "Full-time", label: "Full Time" },
    { value: "Part-time", label: "Part Time" },
    { value: "Contract", label: "Contract" },
    { value: "Temporary", label: "Temporary" },
    { value: "Internship", label: "Internship" },
    { value: "Freelance", label: "Freelance" },
  ];
  const experienceLevelOptions: SelectOption[] = [
    { value: "Entry Level", label: "Entry Level" },
    { value: "Mid Level", label: "Mid Level" },
    { value: "Senior Level", label: "Senior Level" },
    { value: "Executive", label: "Executive" },
  ];

  // Hide the dropdown indicator on skills, like the ATS pages do.
  const skillsSelectComponents = { DropdownIndicator: null };
  const createSkillOption = (label: string): SelectOption => ({ label, value: label });
  const handleSkillsKeyDown = (event: any) => {
    if (!formSkillsInputValue) return;
    if (event.key === "Enter" || event.key === "Tab") {
      const v = formSkillsInputValue.trim();
      if (v && !formSkills.some((s) => s.value.toLowerCase() === v.toLowerCase())) {
        setFormSkills((prev) => [...prev, createSkillOption(v)]);
      }
      setFormSkillsInputValue("");
      event.preventDefault();
    }
  };

  const [viewer, setViewer] = useState<JobTemplate | null>(null);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!canView) router.replace(ROUTES.settingsPersonalInfo);
  }, [permissionsLoaded, canView, router]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await listJobTemplates({ page, limit, sortBy: "createdAt:desc" });
      setRows(res.results ?? []);
      setTotalResults(res.totalResults ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      const msg =
        e instanceof AxiosError ? String((e.response?.data as { message?: string })?.message ?? e.message) : "Failed to load templates.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, page, limit]);

  useEffect(() => {
    if (permissionsLoaded && canView) void load();
  }, [permissionsLoaded, canView, load]);

  const resetExtras = () => {
    setFormJobType(null);
    setFormExperienceLevel(null);
    setFormLocation("");
    setFormSalaryMin("");
    setFormSalaryMax("");
    setFormSalaryCurrency("USD");
    setFormSkills([]);
    setFormSkillsInputValue("");
    setFormEducation("");
  };

  const openCreate = () => {
    setEditingKey(null);
    setFormTitle("");
    setFormBody("<p></p>");
    setFormVisibility("public");
    resetExtras();
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    setSaving(true);
    try {
      const t = await getJobTemplate(id);
      setEditingKey(id);
      setFormTitle(t.title || "");
      setFormBody(normalizeTipTapHtmlFromApi(t.jobDescription) || "<p></p>");
      setFormVisibility(t.visibility === "private" ? "private" : "public");
      setFormJobType(t.jobType ? jobTypeOptions.find((o) => o.value === t.jobType) ?? null : null);
      setFormExperienceLevel(
        t.experienceLevel ? experienceLevelOptions.find((o) => o.value === t.experienceLevel) ?? null : null,
      );
      setFormLocation(t.location ?? "");
      setFormSalaryMin(t.salaryRange?.min != null ? String(t.salaryRange.min) : "");
      setFormSalaryMax(t.salaryRange?.max != null ? String(t.salaryRange.max) : "");
      setFormSalaryCurrency(t.salaryRange?.currency ?? "USD");
      setFormSkills(Array.isArray(t.skillTags) ? t.skillTags.map((s) => createSkillOption(s)) : []);
      setFormSkillsInputValue("");
      setFormEducation(t.education ?? "");
      setModalOpen(true);
    } catch (e) {
      const msg =
        e instanceof AxiosError ? String((e.response?.data as { message?: string })?.message ?? e.message) : "Could not load template.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingKey(null);
  };

  const save = async () => {
    const title = formTitle.trim();
    if (!title) {
      await Swal.fire({ icon: "warning", title: "Title required" });
      return;
    }
    const jobDescription = formBody.trim();
    if (!jobDescription || jobDescription === "<p></p>") {
      await Swal.fire({ icon: "warning", title: "Job description required" });
      return;
    }
    setSaving(true);
    try {
      const minNum = formSalaryMin ? Number(formSalaryMin) : NaN;
      const maxNum = formSalaryMax ? Number(formSalaryMax) : NaN;
      const salaryRange =
        Number.isFinite(minNum) || Number.isFinite(maxNum)
          ? {
              ...(Number.isFinite(minNum) ? { min: minNum } : {}),
              ...(Number.isFinite(maxNum) ? { max: maxNum } : {}),
              currency: formSalaryCurrency || "USD",
            }
          : undefined;
      // Flush any pending skill in the search box that the user hasn't pressed Enter on yet.
      const pendingSkill = formSkillsInputValue.trim();
      const allSkillOpts = pendingSkill
        ? [...formSkills, createSkillOption(pendingSkill)]
        : formSkills;
      const skillTags = allSkillOpts.map((s) => s.value).filter(Boolean);

      const extras = {
        ...(formJobType?.value ? { jobType: formJobType.value as any } : {}),
        ...(formExperienceLevel?.value ? { experienceLevel: formExperienceLevel.value as any } : {}),
        ...(formLocation.trim() ? { location: formLocation.trim() } : {}),
        ...(salaryRange ? { salaryRange } : {}),
        ...(skillTags.length ? { skillTags } : {}),
        ...(formEducation.trim() ? { education: formEducation.trim() } : {}),
      };

      if (editingKey) {
        await updateJobTemplate(editingKey, { title, jobDescription, visibility: formVisibility, ...extras });
      } else {
        await createJobTemplate({ title, jobDescription, visibility: formVisibility, ...extras });
      }
      await Swal.fire({ icon: "success", title: "Saved", toast: true, timer: 2000, showConfirmButton: false, position: "top-end" });
      closeModal();
      await load();
    } catch (e) {
      const msg =
        e instanceof AxiosError ? String((e.response?.data as { message?: string })?.message ?? e.message) : "Save failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: JobTemplate) => {
    const id = templateKey(t);
    if (!id) return;
    const r = await Swal.fire({
      icon: "warning",
      title: "Delete template?",
      text: t.title,
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteJobTemplate(id);
      await load();
      await Swal.fire({ icon: "success", title: "Deleted", toast: true, timer: 1800, showConfirmButton: false, position: "top-end" });
    } catch (e) {
      const msg =
        e instanceof AxiosError ? String((e.response?.data as { message?: string })?.message ?? e.message) : "Delete failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  };

  if (!permissionsLoaded || !canView) {
    return (
      <Fragment>
        <Seo title="My jobs template" />
        <div className="p-4 text-[#8c9097]">Loading…</div>
      </Fragment>
    );
  }

  const startEntry = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  return (
    <Fragment>
      <Seo title="My jobs template" />
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <h5 className="box-title mb-0">
          My jobs template
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">{totalResults}</span>
        </h5>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="jt-page-size" className="sr-only">
            Rows per page
          </label>
          <select
            id="jt-page-size"
            className="form-control select-show-page-size !w-auto !py-1.5 !text-[0.75rem] leading-tight me-0"
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                Show {n}
              </option>
            ))}
          </select>
          {canManage ? (
            <button type="button" className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]" onClick={openCreate}>
              <i className="ri-add-line me-1 align-middle" />
              New template
            </button>
          ) : null}
        </div>
      </div>

      <div className="box-body px-4 pb-6">
        <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-4">
          These descriptions power <strong>ATS → Create job → Load from template</strong>.{" "}
          <strong>Public</strong> templates are visible to everyone who can open this page; <strong>private</strong> templates are only visible to the user who
          created them (admins can still manage them). Recruiters with <code className="text-xs">jobs.manage</code> can add or edit templates; anyone with{" "}
          <code className="text-xs">jobs.read</code> can view and reuse templates they are allowed to see.
        </p>

        <div className="table-responsive overflow-x-auto">
          <table className="table min-w-full table-bordered border-defaultborder">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-start font-semibold">S.no.</th>
                <th className="px-4 py-2.5 text-start font-semibold">Template title</th>
                <th className="px-4 py-2.5 text-center font-semibold">Visibility</th>
                <th className="px-4 py-2.5 text-center font-semibold">Uses</th>
                <th className="px-4 py-2.5 text-start font-semibold">Updated</th>
                <th className="px-4 py-2.5 text-center font-semibold w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-defaulttextcolor/70">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-defaulttextcolor/70">
                    No job templates yet.{canManage ? " Create one to reuse for new roles." : ""}
                  </td>
                </tr>
              ) : (
                rows.map((t, idx) => {
                  const id = templateKey(t);
                  const serial = (page - 1) * limit + idx + 1;
                  return (
                    <tr key={id || idx} className="border-b border-defaultborder">
                      <td className="px-4 py-2.5 align-middle">{serial}</td>
                      <td className="px-4 py-2.5 align-middle font-medium">{t.title}</td>
                      <td className="px-4 py-2.5 align-middle text-center">
                        {t.visibility === "private" ? (
                          <span className="badge bg-light text-default border border-defaultborder rounded-full text-[0.7rem] font-medium px-2 py-0.5">
                            Private
                          </span>
                        ) : (
                          <span className="badge bg-primary/10 text-primary rounded-full text-[0.7rem] font-medium px-2 py-0.5">
                            Public
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center tabular-nums">{t.usageCount ?? 0}</td>
                      <td className="px-4 py-2.5 align-middle text-[0.8125rem]">{formatTs(t.updatedAt ?? t.createdAt)}</td>
                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                            aria-label={`View ${t.title}`}
                            onClick={() => setViewer(t)}
                          >
                            <i className="ri-eye-line" />
                          </button>
                          <Link
                            href={`/ats/jobs/create/?templateId=${encodeURIComponent(id)}`}
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light inline-flex items-center justify-center"
                            title="Start a new job with this description"
                            aria-label={`Create job from ${t.title}`}
                          >
                            <i className="ri-file-add-line" />
                          </Link>
                          {canManage ? (
                            <>
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                                aria-label={`Edit ${t.title}`}
                                onClick={() => void openEdit(id)}
                              >
                                <i className="ri-pencil-line" />
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                                aria-label={`Delete ${t.title}`}
                                onClick={() => void remove(t)}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 ? (
          <div className="flex items-center justify-between flex-wrap gap-2 mt-4 text-[0.8125rem] text-defaulttextcolor/80">
            <span>
              Showing {startEntry} to {end} of {totalResults} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="jt-modal-title">
          <div className="bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-defaultborder">
            <div className="px-4 py-3 border-b border-defaultborder flex items-center justify-between">
              <h2 id="jt-modal-title" className="text-lg font-semibold mb-0">
                {editingKey ? "Edit template" : "New job template"}
              </h2>
              <button type="button" className="ti-btn ti-btn-sm ti-btn-light" onClick={closeModal} aria-label="Close">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div>
                <label className="form-label">Template title</label>
                <input
                  type="text"
                  className="form-control"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Java Developer"
                />
              </div>
              <div>
                <span className="form-label d-block">Visibility</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
                  <label className="flex gap-2 cursor-pointer items-start mb-0">
                    <input
                      type="radio"
                      className="mt-1"
                      name="job-template-visibility"
                      checked={formVisibility === "public"}
                      onChange={() => setFormVisibility("public")}
                      disabled={!canManage}
                    />
                    <span className="text-[0.875rem]">
                      <span className="font-medium text-defaulttextcolor">Public</span>
                      <span className="block text-[#8c9097] dark:text-white/50 text-[0.8125rem] mt-0.5">
                        Shared with everyone who can open My jobs template in Settings.
                      </span>
                    </span>
                  </label>
                  <label className="flex gap-2 cursor-pointer items-start mb-0">
                    <input
                      type="radio"
                      className="mt-1"
                      name="job-template-visibility"
                      checked={formVisibility === "private"}
                      onChange={() => setFormVisibility("private")}
                      disabled={!canManage}
                    />
                    <span className="text-[0.875rem]">
                      <span className="font-medium text-defaulttextcolor">Private</span>
                      <span className="block text-[#8c9097] dark:text-white/50 text-[0.8125rem] mt-0.5">
                        Only you can see and reuse this template (plus administrators).
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              {/* Optional structured defaults — same controls/options as ATS Create / Edit Job. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Job type</label>
                  <Select
                    classNamePrefix="react-select"
                    options={jobTypeOptions}
                    value={formJobType}
                    onChange={(v: any) => setFormJobType((v as SelectOption) ?? null)}
                    placeholder="Select job type"
                    isClearable
                    isDisabled={!canManage}
                    menuPortalTarget={selectMenuPortalTarget}
                    styles={selectMenuLayerStyles}
                  />
                </div>
                <div>
                  <label className="form-label">Experience level</label>
                  <Select
                    classNamePrefix="react-select"
                    options={experienceLevelOptions}
                    value={formExperienceLevel}
                    onChange={(v: any) => setFormExperienceLevel((v as SelectOption) ?? null)}
                    placeholder="Select experience"
                    isClearable
                    isDisabled={!canManage}
                    menuPortalTarget={selectMenuPortalTarget}
                    styles={selectMenuLayerStyles}
                  />
                </div>
                <div>
                  <label className="form-label">Default location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Bangalore, Remote"
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <label className="form-label">Education</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formEducation}
                    onChange={(e) => setFormEducation(e.target.value)}
                    placeholder="e.g. B.Tech in CS or equivalent"
                    disabled={!canManage}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Default skills</label>
                  <CreatableSelect
                    components={skillsSelectComponents}
                    classNamePrefix="react-select"
                    inputValue={formSkillsInputValue}
                    isClearable
                    isMulti
                    menuIsOpen={false}
                    onChange={(v: any) => setFormSkills(Array.isArray(v) ? (v as SelectOption[]) : [])}
                    onInputChange={(v: string) => setFormSkillsInputValue(v)}
                    onKeyDown={handleSkillsKeyDown}
                    placeholder="Type a skill and press Enter (e.g. React, Node.js, PostgreSQL)"
                    value={formSkills}
                    isDisabled={!canManage}
                    menuPortalTarget={selectMenuPortalTarget}
                    styles={selectMenuLayerStyles}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Default salary range</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      className="form-control"
                      value={formSalaryMin}
                      onChange={(e) => setFormSalaryMin(e.target.value)}
                      placeholder="Min"
                      disabled={!canManage}
                    />
                    <input
                      type="number"
                      className="form-control"
                      value={formSalaryMax}
                      onChange={(e) => setFormSalaryMax(e.target.value)}
                      placeholder="Max"
                      disabled={!canManage}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={formSalaryCurrency}
                      onChange={(e) => setFormSalaryCurrency(e.target.value)}
                      placeholder="USD"
                      disabled={!canManage}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0">
                These optional fields prefill the matching inputs on <strong>ATS → Create job</strong> when this template is loaded. Leave blank to skip.
              </p>
              <div>
                <label className="form-label">Job description</label>
                <div className="border border-defaultborder rounded-md overflow-hidden">
                  <TiptapEditor content={formBody} placeholder="Role summary, responsibilities, requirements…" onChange={setFormBody} />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-defaultborder flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="ti-btn ti-btn-primary" onClick={() => void save()} disabled={saving || !canManage}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewer ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-defaultborder">
            <div className="px-4 py-3 border-b border-defaultborder flex items-center justify-between">
              <h2 className="text-lg font-semibold mb-0">{viewer.title}</h2>
              <button type="button" className="ti-btn ti-btn-sm ti-btn-light" onClick={() => setViewer(null)} aria-label="Close">
                <i className="ri-close-line" />
              </button>
            </div>
            <div
              className="p-4 overflow-y-auto flex-1 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewer.jobDescription || "") }}
            />
            <div className="px-4 py-3 border-t border-defaultborder flex justify-end">
              <button type="button" className="ti-btn ti-btn-primary" onClick={() => setViewer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Fragment>
  );
}
