"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createOffer, getOfferLetterDefaults, type Offer, type OfferLetterJobType } from "@/shared/lib/api/offers";
import { listJobApplications, type JobApplication } from "@/shared/lib/api/jobApplications";

function formatCandidateAddress(c: JobApplication["candidate"] | undefined) {
  const a = c?.address;
  if (!a || typeof a !== "object") return "";
  return [a.streetAddress, a.streetAddress2, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(", ");
}

export type CreateOfferFormProps = {
  onSuccess: (created: Offer) => void;
  /** Full-page mode: Cancel is a link to this URL. */
  cancelHref?: string;
  /** Modal mode: Cancel button. Ignored if `cancelHref` is set. */
  onCancel?: () => void;
  variant?: "page" | "modal";
  /**
   * When false (e.g. Offer Letter Generator new-offer flow), selecting an application only sets the
   * application id — name, address, and role templates are not auto-filled so the letter can be filled manually.
   */
  prefillFromApplication?: boolean;
};

const getApplicationId = (ja: JobApplication) =>
  (ja as { _id?: string; id?: string })._id ?? (ja as { id?: string }).id ?? "";

export function CreateOfferForm({
  onSuccess,
  cancelHref,
  onCancel,
  variant = "page",
  prefillFromApplication = true,
}: CreateOfferFormProps) {
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    jobApplicationId: "",
    base: 0,
    hra: 0,
    gross: 0,
    currency: "INR" as "INR" | "USD",
    joiningDate: "",
    offerValidityDate: "",
    notes: "",
    letterFullName: "",
    letterAddress: "",
    positionTitle: "",
    jobType: "FT_40" as OfferLetterJobType,
    weeklyHours: 40 as 25 | 40,
    workLocation: "Remote (USA)",
    rolesText: "",
    trainingText: "",
    compensationNarrative: "",
    academicNote: "",
    eligibilityText: "",
    supFirst: "Jason",
    supLast: "Mendonca",
    supPhone: "+1-307-206-9144",
    supEmail: "jason@dharwinbusinesssolutions.com",
  });

  useEffect(() => {
    listJobApplications({ limit: 200 })
      .then((res) => {
        const all = res.results ?? [];
        const eligible = all.filter(
          (ja) => ja.status && ["Applied", "Screening", "Interview"].includes(ja.status)
        );
        setJobApplications(eligible);
      })
      .catch(() => setJobApplications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleApplicationChange = async (applicationId: string) => {
    if (!applicationId) {
      setForm((f) => ({ ...f, jobApplicationId: "" }));
      return;
    }
    const ja = jobApplications.find((j) => getApplicationId(j) === applicationId);
    if (!ja) {
      setForm((f) => ({ ...f, jobApplicationId: applicationId }));
      return;
    }
    if (!prefillFromApplication) {
      setForm((f) => ({ ...f, jobApplicationId: applicationId }));
      return;
    }
    const positionTitle = ja.job?.title || "";
    const letterAddress = formatCandidateAddress(ja.candidate);
    const letterFullName = ja.candidate?.fullName || "";
    let rolesText = "";
    let trainingText = "";
    try {
      const d = await getOfferLetterDefaults(positionTitle);
      rolesText = d.roleResponsibilities.join("\n");
      trainingText = d.trainingOutcomes.join("\n");
    } catch {
      // leave empty; user can type
    }
    setForm((f) => ({
      ...f,
      jobApplicationId: applicationId,
      positionTitle: positionTitle || f.positionTitle,
      letterFullName: letterFullName || f.letterFullName,
      letterAddress: letterAddress || f.letterAddress,
      rolesText,
      trainingText,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.jobApplicationId) {
      setError("Please select a job application");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(form.jobApplicationId)) {
      setError("Invalid job application selected");
      return;
    }
    const isIntern = form.jobType === "INTERN_UNPAID";
    if (!isIntern && !Number(form.gross)) {
      setError("Enter gross CTC, or set job type to Training / Unpaid internship if there is no salary.");
      return;
    }
    const roleResponsibilities = form.rolesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const trainingOutcomes = form.trainingText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const employmentEligibilityLines = form.eligibilityText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const weeklyHours: 25 | 40 =
      form.jobType === "PT_25" ? 25 : form.jobType === "FT_40" ? 40 : form.weeklyHours;
    setSubmitting(true);
    try {
      const created = await createOffer({
        jobApplicationId: form.jobApplicationId,
        ctcBreakdown: {
          base: form.base,
          hra: form.hra,
          gross: form.gross,
          currency: form.currency,
        },
        joiningDate: form.joiningDate || null,
        offerValidityDate: form.offerValidityDate || null,
        notes: form.notes || undefined,
        letterFullName: form.letterFullName.trim() || undefined,
        letterAddress: form.letterAddress.trim() || undefined,
        positionTitle: form.positionTitle.trim() || undefined,
        jobType: form.jobType,
        weeklyHours,
        workLocation: form.workLocation.trim() || undefined,
        roleResponsibilities: roleResponsibilities.length ? roleResponsibilities : undefined,
        trainingOutcomes: isIntern && trainingOutcomes.length > 0 ? trainingOutcomes : undefined,
        compensationNarrative: form.compensationNarrative.trim() || undefined,
        academicAlignmentNote: form.academicNote.trim() || undefined,
        employmentEligibilityLines: employmentEligibilityLines.length ? employmentEligibilityLines : undefined,
        supervisor: {
          firstName: form.supFirst.trim() || undefined,
          lastName: form.supLast.trim() || undefined,
          phone: form.supPhone.trim() || undefined,
          email: form.supEmail.trim() || undefined,
        },
      });
      onSuccess(created);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to create offer";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isIntern = form.jobType === "INTERN_UNPAID";
  const isModal = variant === "modal";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>}

      {isModal && (
        <div className="p-3 rounded-lg bg-primary/5 text-sm text-gray-700 dark:text-gray-300 border border-primary/20 space-y-1">
          <p className="font-medium text-gray-900 dark:text-white">Two-step flow</p>
          {prefillFromApplication ? (
            <>
              <p className="text-xs leading-relaxed">
                <strong>Here:</strong> choose the application and set compensation / dates — only what&apos;s needed to
                create the offer record. Name, address, roles, training, and PDF options are filled from the application
                (and templates) in the background.
              </p>
              <p className="text-xs leading-relaxed">
                <strong>Next:</strong> the <strong>Offer Letter Generator</strong> opens on the list so you can edit the
                letter. <strong>Generate PDF</strong> runs automatically; then <strong>Download</strong> (next to
                Generate PDF) fetches the same server PDF — it enables after the first successful generate.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs leading-relaxed">
                <strong>Here:</strong> link the offer to an application and set compensation and dates. The application
                is not used to pre-fill the letter (name, address, and roles stay empty for you to type).
              </p>
              <p className="text-xs leading-relaxed">
                <strong>Next:</strong> you&apos;ll return to <strong>Offers &amp; Placement</strong> with the same
                full-screen <strong>Offer Letter Generator</strong> and the <strong>same PDF output</strong> (preview +
                <strong> Generate PDF</strong> / <strong>Download</strong>) as the row &quot;Offer letter&quot; action. Fill
                the letter, then generate when ready.
              </p>
            </>
          )}
        </div>
      )}

      <div>
        <label className="form-label">
          Job Application <span className="text-danger">*</span>
        </label>
        <select
          className="form-control"
          value={form.jobApplicationId}
          onChange={(e) => void handleApplicationChange(e.target.value)}
          required
        >
          <option value="">Select application...</option>
          {jobApplications.map((ja) => {
            const appId = getApplicationId(ja);
            return (
              <option key={appId} value={appId}>
                {ja.job?.title} – {ja.candidate?.fullName} ({ja.candidate?.email})
              </option>
            );
          })}
          {!loading && jobApplications.length === 0 && <option disabled>No applications available</option>}
        </select>
        {!loading && jobApplications.length === 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-3 rounded-lg bg-gray-50 dark:bg-black/20 space-y-1">
            <p className="font-medium">No applications available to create an offer.</p>
            <p className="text-xs">
              Offers can only be created from applications in <strong>Applied</strong>, <strong>Screening</strong>, or{" "}
              <strong>Interview</strong> stage (not Offered, Hired, or Rejected). Apply candidates to jobs from the
              Jobs page.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="form-label">Base (CTC)</label>
          <input
            type="number"
            className="form-control"
            value={form.base || ""}
            onChange={(e) => setForm((f) => ({ ...f, base: Number(e.target.value) || 0 }))}
            placeholder="0"
            min={0}
          />
        </div>
        <div>
          <label className="form-label">HRA</label>
          <input
            type="number"
            className="form-control"
            value={form.hra || ""}
            onChange={(e) => setForm((f) => ({ ...f, hra: Number(e.target.value) || 0 }))}
            placeholder="0"
            min={0}
          />
        </div>
        <div>
          <label className="form-label">
            Gross CTC{" "}
            {isIntern ? <span className="text-gray-500">(0 for unpaid)</span> : <span className="text-danger">*</span>}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              className="form-control flex-1"
              value={form.gross || ""}
              onChange={(e) => setForm((f) => ({ ...f, gross: Number(e.target.value) || 0 }))}
              placeholder="0"
              min={0}
            />
            <select
              className="form-control w-28"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "INR" | "USD" }))}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="form-label">Joining Date</label>
          <input
            type="date"
            className="form-control"
            value={form.joiningDate}
            onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="form-label">Offer Validity Date</label>
          <input
            type="date"
            className="form-control"
            value={form.offerValidityDate}
            onChange={(e) => setForm((f) => ({ ...f, offerValidityDate: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          rows={isModal ? 2 : 3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Optional notes"
        />
      </div>

      {isModal && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Job type</label>
            <select
              className="form-control"
              value={form.jobType}
              onChange={(e) => {
                const v = e.target.value as OfferLetterJobType;
                setForm((f) => ({
                  ...f,
                  jobType: v,
                  weeklyHours: v === "PT_25" ? 25 : v === "FT_40" ? 40 : f.weeklyHours,
                }));
              }}
            >
              <option value="FT_40">Full time — 40 hr/week</option>
              <option value="PT_25">Part time — 25 hr/week</option>
              <option value="INTERN_UNPAID">Training / Unpaid internship</option>
            </select>
          </div>
          <div>
            <label className="form-label">Weekly hours (intern)</label>
            <select
              className="form-control"
              value={form.weeklyHours}
              disabled={!isIntern}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  weeklyHours: Number(e.target.value) === 25 ? 25 : 40,
                }))
              }
            >
              <option value={40}>40</option>
              <option value={25}>25</option>
            </select>
          </div>
          <div>
            <label className="form-label">Work location</label>
            <input
              className="form-control"
              value={form.workLocation}
              onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
            />
          </div>
        </div>
      )}

      {!isModal && (
      <div className="border border-gray-200 dark:border-defaultborder/10 rounded-lg p-4 space-y-4 bg-gray-50/80 dark:bg-black/20">
        <h6 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i className="ri-file-pdf-2-line text-primary"></i>
          Offer letter (PDF) — <strong>Generate PDF</strong> + <strong>Download</strong> in the top bar (same as opening
          from an offer row)
        </h6>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Pre-filled from the selected application (name, address from profile, job title, suggested roles). After you
          submit, you&apos;ll return to <strong>Offers &amp; Placement</strong> with the letter workspace open,{" "}
          <strong>Generate PDF</strong> started, and <strong>Download</strong> enabled once the server PDF is stored
          (same two buttons as when you open the letter from the table).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full name (on letter)</label>
            <input
              className="form-control"
              value={form.letterFullName}
              onChange={(e) => setForm((f) => ({ ...f, letterFullName: e.target.value }))}
              placeholder="Candidate full name"
            />
          </div>
          <div>
            <label className="form-label">Position (on letter)</label>
            <input
              className="form-control"
              value={form.positionTitle}
              onChange={(e) => setForm((f) => ({ ...f, positionTitle: e.target.value }))}
              placeholder="Job title"
            />
          </div>
        </div>
        <div>
          <label className="form-label">Address (full line)</label>
          <input
            className="form-control"
            value={form.letterAddress}
            onChange={(e) => setForm((f) => ({ ...f, letterAddress: e.target.value }))}
            placeholder="Street, city, state, ZIP, country"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Job type</label>
            <select
              className="form-control"
              value={form.jobType}
              onChange={(e) => {
                const v = e.target.value as OfferLetterJobType;
                setForm((f) => ({
                  ...f,
                  jobType: v,
                  weeklyHours: v === "PT_25" ? 25 : v === "FT_40" ? 40 : f.weeklyHours,
                }));
              }}
            >
              <option value="FT_40">Full time — 40 hr/week</option>
              <option value="PT_25">Part time — 25 hr/week</option>
              <option value="INTERN_UNPAID">Training / Unpaid internship</option>
            </select>
          </div>
          <div>
            <label className="form-label">Weekly hours (intern)</label>
            <select
              className="form-control"
              value={form.weeklyHours}
              disabled={!isIntern}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  weeklyHours: Number(e.target.value) === 25 ? 25 : 40,
                }))
              }
            >
              <option value={40}>40</option>
              <option value={25}>25</option>
            </select>
          </div>
          <div>
            <label className="form-label">Location</label>
            <input
              className="form-control"
              value={form.workLocation}
              onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="form-label">Roles &amp; responsibilities (one per line)</label>
          <textarea
            className="form-control font-mono text-xs min-h-[100px]"
            value={form.rolesText}
            onChange={(e) => setForm((f) => ({ ...f, rolesText: e.target.value }))}
            placeholder="Suggested from job title; edit as needed"
          />
        </div>
        {isIntern && (
          <div>
            <label className="form-label">Training &amp; learning outcomes (one per line)</label>
            <textarea
              className="form-control font-mono text-xs min-h-[80px]"
              value={form.trainingText}
              onChange={(e) => setForm((f) => ({ ...f, trainingText: e.target.value }))}
            />
          </div>
        )}
        {!isIntern && (
          <>
            <div>
              <label className="form-label">Compensation paragraph (optional; USD/INR uses gross above)</label>
              <textarea
                className="form-control text-xs min-h-[70px]"
                value={form.compensationNarrative}
                onChange={(e) => setForm((f) => ({ ...f, compensationNarrative: e.target.value }))}
                placeholder="Leave blank to auto-build from gross CTC and currency on generate"
              />
            </div>
            <p className="text-xs text-gray-500">Supervisor (printed on full-time / part-time letters)</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="form-control"
                placeholder="First name"
                value={form.supFirst}
                onChange={(e) => setForm((f) => ({ ...f, supFirst: e.target.value }))}
              />
              <input
                className="form-control"
                placeholder="Last name"
                value={form.supLast}
                onChange={(e) => setForm((f) => ({ ...f, supLast: e.target.value }))}
              />
              <input
                className="form-control"
                placeholder="Phone"
                value={form.supPhone}
                onChange={(e) => setForm((f) => ({ ...f, supPhone: e.target.value }))}
              />
              <input
                className="form-control"
                placeholder="Email"
                value={form.supEmail}
                onChange={(e) => setForm((f) => ({ ...f, supEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Academic / degree alignment (optional)</label>
              <textarea
                className="form-control text-xs min-h-[56px]"
                value={form.academicNote}
                onChange={(e) => setForm((f) => ({ ...f, academicNote: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Employment eligibility (optional, one per line)</label>
              <textarea
                className="form-control font-mono text-xs min-h-[56px]"
                value={form.eligibilityText}
                onChange={(e) => setForm((f) => ({ ...f, eligibilityText: e.target.value }))}
              />
            </div>
          </>
        )}
      </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          className="ti-btn ti-btn-primary"
          disabled={submitting || (!loading && jobApplications.length === 0)}
        >
          {submitting ? (
            <>
              <i className="ri-loader-4-line animate-spin me-1"></i>Creating...
            </>
          ) : isModal ? (
            <>
              <i className="ri-file-text-line me-1"></i>Create &amp; open letter
            </>
          ) : (
            <>
              <i className="ri-add-line me-1"></i>Create Offer
            </>
          )}
        </button>
        {cancelHref ? (
          <Link href={cancelHref} className="ti-btn ti-btn-light">
            Cancel
          </Link>
        ) : onCancel ? (
          <button type="button" className="ti-btn ti-btn-light" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
