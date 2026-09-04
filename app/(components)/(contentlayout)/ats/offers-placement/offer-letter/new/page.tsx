"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import {
  OfferLetterGeneratorWorkspace,
  createEmptyOfferLetterForm,
  type OfferLetterFormFields,
} from "../../OfferLetterGeneratorWorkspace";
import {
  createOffer,
  saveOfferLetter,
  formatOfferLetterSaveError,
  getOfferById,
  getOfferLetterDefaults,
  listOffers,
  type Offer,
  type OfferLetterJobType,
} from "@/shared/lib/api/offers";
import { buildCreateOfferPayloadFromLetterForm } from "../../build-create-offer-payload";
import { buildOfferLetterUpdatePayload } from "../../build-offer-letter-update-payload";
import { confirmCompensationChange } from "../../confirm-compensation-change";
import { detectEligibilityPreset } from "../../offer-letter-generator-data";
import {
  combinedJobPostingDocText,
  resolveOfferLetterRolesHtml,
  resolveOfferLetterTrainingHtml,
} from "../../job-posting-doc";
import { roleResponsibilitiesLinesToHtml } from "@/shared/lib/ats/jobDescriptionHtml";
import { letterDateStampYmd } from "../../letter-date-stamp";
import { listJobApplications, type JobApplication } from "@/shared/lib/api/jobApplications";
import {
  isJobApplicationEligibleForOffer,
  jobApplicationRecordId,
} from "@/shared/lib/ats/offer-application-eligibility";
import { findJobApplicationById, resolveOfferInterviewBypassAck } from "@/shared/lib/ats/resolve-offer-interview-bypass";

function formatCandidateAddress(c: { address?: Offer["candidate"]["address"] } | null | undefined) {
  const a = c?.address;
  if (!a || typeof a !== "object") return "";
  return [a.streetAddress, a.streetAddress2, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(", ");
}

function getOfferRecordId(o: { _id?: string; id?: string } | null | undefined): string {
  const v = o?._id ?? o?.id;
  if (v == null) return "";
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null") return "";
  return s;
}

/**
 * Offer letter linked to a job application (required on first save).
 * Open with `?offerId=` to continue an existing offer.
 */
export default function NewOfferLetterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerIdParam = searchParams.get("offerId");

  const { confirm, confirmDialog } = useConfirm();
  const [letterForm, setLetterForm] = useState(() => createEmptyOfferLetterForm());
  const [linkedOffer, setLinkedOffer] = useState<Offer | null>(null);
  const [letterBusy, setLetterBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [jobApplicationId, setJobApplicationId] = useState("");

  useEffect(() => {
    if (!offerIdParam || !/^[0-9a-fA-F]{24}$/.test(offerIdParam)) {
      return;
    }
    let cancelled = false;
    setLoadError(null);
    setLetterBusy(true);
    getOfferById(offerIdParam)
      .then((o) => {
        if (cancelled) return;
        setLinkedOffer(o);
        const c = o.candidate;
        const addr = formatCandidateAddress(c);
        const jt = (o.jobType as OfferLetterJobType) || "FT_40";
        const isIntern = jt === "INTERN_UNPAID";
        const eligLines = o.employmentEligibilityLines || [];
        let eligibilityPreset = detectEligibilityPreset(eligLines, isIntern);
        if (isIntern && eligibilityPreset === "none" && eligLines.length === 0) {
          eligibilityPreset = "opt_stem";
        }
        if (!isIntern && eligibilityPreset === "none" && eligLines.length === 0) {
          eligibilityPreset = "opt_stem";
        }
        const eligibilityText = eligibilityPreset === "custom" ? eligLines.join("\n") : "";
        const base: OfferLetterFormFields = {
          letterFullName: o.letterFullName || c?.fullName || "",
          letterAddress: o.letterAddress || addr || "",
          positionTitle: o.positionTitle || o.job?.title || "",
          joiningDate: o.joiningDate ? String(o.joiningDate).slice(0, 10) : "",
          letterDate: o.letterDate ? String(o.letterDate).slice(0, 10) : letterDateStampYmd(),
          jobType: jt,
          weeklyHours: typeof o.weeklyHours === 'number' ? o.weeklyHours : 40,
          workLocation: o.workLocation || "Remote (USA)",
          rolesText: resolveOfferLetterRolesHtml(o),
          trainingText: resolveOfferLetterTrainingHtml(o),
          annualGrossCtc:
            o.ctcBreakdown?.gross != null && Number(o.ctcBreakdown.gross) > 0 ? String(o.ctcBreakdown.gross) : "",
          ctcCurrency: (o.ctcBreakdown?.currency || "USD").toUpperCase() === "INR" ? "INR" : "USD",
          academicNote: o.academicAlignmentNote || "",
          eligibilityPreset,
          eligibilityText,
          supFirst: o.supervisor?.firstName || "Jason",
          supLast: o.supervisor?.lastName || "Mendonca",
          supPhone: o.supervisor?.phone || "+1-307-206-9144",
          supEmail: o.supervisor?.email || "jason@dharwinbusinesssolutions.com",
        };
        setLetterForm(base);
        const needRoleDefaults = !base.rolesText.trim();
        const needTrainingDefaults = isIntern && !base.trainingText.trim();
        if (needRoleDefaults || needTrainingDefaults) {
          /* Pass job id so Roles & Responsibilities are derived from the linked job's description. */
          const offerJobId =
            (o.job as { _id?: string; id?: string } | undefined)?._id ??
            (o.job as { id?: string } | undefined)?.id;
          getOfferLetterDefaults(o.job?.title || "", offerJobId)
            .then((d) => {
              if (cancelled) return;
              setLetterForm((f) => ({
                ...f,
                rolesText: f.rolesText.trim()
                  ? f.rolesText
                  : (String(d.positionOverviewHtml ?? "").trim() ||
                      roleResponsibilitiesLinesToHtml(d.roleResponsibilities)),
                trainingText:
                  f.trainingText.trim()
                    ? f.trainingText
                    : isIntern
                      ? String(d.trainingOutcomesHtml ?? "").trim() ||
                        roleResponsibilitiesLinesToHtml(d.trainingOutcomes)
                      : f.trainingText,
              }));
            })
            .catch(() => {});
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (e as Error)?.message ||
            "Could not load offer"
        );
      })
      .finally(() => {
        if (!cancelled) setLetterBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerIdParam]);

  useEffect(() => {
    if (offerIdParam) return;
    let cancelled = false;
    setApplicationsLoading(true);
    Promise.all([listJobApplications({ limit: 500 }), listOffers({ limit: 500 })])
      .then(([appsRes, offersRes]) => {
        if (cancelled) return;
        const appIdsWithOffer = new Set(
          (offersRes.results ?? [])
            .map((o) => String(o.jobApplication || "").trim())
            .filter(Boolean)
        );
        setJobApplications(
          (appsRes.results ?? []).filter((ja) =>
            isJobApplicationEligibleForOffer(ja.status, jobApplicationRecordId(ja), appIdsWithOffer)
          )
        );
      })
      .catch(() => {
        if (!cancelled) setJobApplications([]);
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerIdParam]);

  const candidateOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const ja of jobApplications) {
      const cid =
        (ja.candidate as { _id?: string; id?: string } | undefined)?._id ??
        (ja.candidate as { id?: string } | undefined)?.id;
      if (!cid) continue;
      const id = String(cid);
      if (byId.has(id)) continue;
      const name = ja.candidate?.fullName || "Candidate";
      const email = ja.candidate?.email || "";
      byId.set(id, { id, label: email ? `${name} (${email})` : name });
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [jobApplications]);

  const applicationsForCandidate = useMemo(() => {
    if (!selectedCandidateId) return [];
    return jobApplications.filter((ja) => {
      const cid =
        (ja.candidate as { _id?: string; id?: string } | undefined)?._id ??
        (ja.candidate as { id?: string } | undefined)?.id;
      return cid != null && String(cid) === selectedCandidateId;
    });
  }, [jobApplications, selectedCandidateId]);

  const applicationOptions = useMemo(
    () =>
      applicationsForCandidate.map((ja) => ({
        id: jobApplicationRecordId(ja),
        label: `${ja.job?.title || "Job"} (${ja.status})`,
      })),
    [applicationsForCandidate]
  );

  const handleCandidateChange = useCallback(
    (candidateId: string) => {
      setSelectedCandidateId(candidateId);
      setJobApplicationId("");
      const ja = candidateId
        ? jobApplications.find((j) => {
            const cid =
              (j.candidate as { _id?: string; id?: string } | undefined)?._id ??
              (j.candidate as { id?: string } | undefined)?.id;
            return cid != null && String(cid) === candidateId;
          })
        : undefined;
      setLetterForm((prev) => ({
        ...prev,
        letterFullName: ja?.candidate?.fullName || "",
        letterAddress: ja ? formatCandidateAddress(ja.candidate) : "",
        positionTitle: "",
        rolesText: "",
        trainingText: "",
      }));
    },
    [jobApplications]
  );

  const applyApplicationToLetter = useCallback(async (applicationId: string) => {
    setJobApplicationId(applicationId);
    if (!applicationId) return;
    const ja = jobApplications.find((j) => jobApplicationRecordId(j) === applicationId);
    if (!ja) return;
    const positionTitle = ja.job?.title || "";
    const jobId =
      (ja.job as { _id?: string; id?: string } | undefined)?._id ??
      (ja.job as { id?: string } | undefined)?.id;
    const letterAddress = formatCandidateAddress(ja.candidate);
    const letterFullName = ja.candidate?.fullName || "";
    let rolesText = "";
    let trainingText = "";
    try {
      const d = await getOfferLetterDefaults(positionTitle, jobId);
      rolesText =
        String(d.positionOverviewHtml ?? "").trim() ||
        roleResponsibilitiesLinesToHtml(d.roleResponsibilities);
      trainingText =
        String(d.trainingOutcomesHtml ?? "").trim() ||
        roleResponsibilitiesLinesToHtml(d.trainingOutcomes);
    } catch {
      // optional
    }
    setLetterForm((prev) => ({
      ...prev,
      letterFullName: letterFullName || prev.letterFullName,
      letterAddress: letterAddress || prev.letterAddress,
      positionTitle: positionTitle || prev.positionTitle,
      rolesText: prev.rolesText.trim() ? prev.rolesText : rolesText,
      trainingText: prev.trainingText.trim() ? prev.trainingText : trainingText,
    }));
  }, [jobApplications]);

  const handleSaveLetter = useCallback(async () => {
    const isIntern = letterForm.jobType === "INTERN_UNPAID";
    const g = Number(String(letterForm.annualGrossCtc).replace(/,/g, ""));

    if (linkedOffer) {
      const id = getOfferRecordId(linkedOffer);
      if (!id) {
        alert("This offer has no id. Go back to Offers & Placement and open the letter from the list.");
        return;
      }

      /**
       * Compensation stops being a draft term once the candidate is past the offer stage — it then
       * drives the employee badge, list filters, headcount and exports. The server enforces this;
       * the dialog exists so the user is told before the save fails rather than after.
       */
      const { proceed, ack: compensationAck } = await confirmCompensationChange({
        gate: linkedOffer.compensationGate,
        changing: !!linkedOffer.jobType && letterForm.jobType !== linkedOffer.jobType,
        confirm,
      });
      if (!proceed) return;

      setLetterBusy(true);
      try {
        const updated = await saveOfferLetter(id, {
          ...buildOfferLetterUpdatePayload(letterForm, linkedOffer),
          ...(compensationAck ? { compensationChangeAck: true } : {}),
        });
        setLinkedOffer(updated);
        const newId = getOfferRecordId(updated);
        if (newId && (!offerIdParam || offerIdParam !== newId)) {
          router.replace(`/ats/offers-placement/offer-letter/new?offerId=${encodeURIComponent(newId)}`, {
            scroll: false,
          });
        }
      } catch (e: unknown) {
        alert(formatOfferLetterSaveError(e, "Could not save letter"));
      } finally {
        setLetterBusy(false);
      }
      return;
    }

    if (!isIntern && (!Number.isFinite(g) || g <= 0)) {
      alert("Set annual gross in Compensation before saving a paid offer letter.");
      return;
    }
    if (!jobApplicationId) {
      alert("Select a candidate and job applied for before saving.");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(jobApplicationId)) {
      alert("Invalid job application selected.");
      return;
    }
    const selectedApp = findJobApplicationById(jobApplications, jobApplicationId);
    const bypassAck = await resolveOfferInterviewBypassAck(selectedApp, confirm);
    if (bypassAck === false) return;

    setLetterBusy(true);
    try {
      const created = await createOffer({
        ...buildCreateOfferPayloadFromLetterForm(jobApplicationId, "", "", 0, 0, letterForm),
        ...(bypassAck ? { ackBypassInterview: true } : {}),
      });
      const id = getOfferRecordId(created);
      if (!id) {
        throw new Error("Create offer returned no id");
      }

      setLinkedOffer(created);
      const updated = await saveOfferLetter(id, buildOfferLetterUpdatePayload(letterForm, created));
      setLinkedOffer(updated);
      router.replace(`/ats/offers-placement/offer-letter/new?offerId=${encodeURIComponent(id)}`, { scroll: false });
    } catch (e: unknown) {
      alert(formatOfferLetterSaveError(e, "Could not create offer or save letter"));
    } finally {
      setLetterBusy(false);
    }
  }, [letterForm, linkedOffer, offerIdParam, router, confirm, jobApplicationId, jobApplications]);

  const standaloneLetterJobPostingDoc = useMemo(
    () => combinedJobPostingDocText(linkedOffer?.job) ?? null,
    [linkedOffer],
  );

  const loadingOfferFromId = Boolean(offerIdParam && letterBusy && !loadError);
  const showApplicationPicker = !linkedOffer && !offerIdParam;

  const formPanelLinkOffer = !linkedOffer && (loadingOfferFromId || (loadError && offerIdParam)) ? (
      <div className="px-0 pb-1 space-y-2">
        {loadingOfferFromId ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading offer…</p>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded p-2">
            {loadError}
          </p>
        )}
      </div>
    ) : null;

  return (
    <Fragment>
      {confirmDialog}
      <Seo fullDocumentTitle="Offer Letter" />
      <div className="offer-letter-page-shell w-full min-w-0 max-w-full min-h-[32rem] h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-3rem)] overflow-hidden [&>div]:h-full [&>div]:min-h-0 [&>div]:min-w-0">
        <OfferLetterGeneratorWorkspace
          offerCode={linkedOffer?.offerCode || "—"}
          jobTitle={letterForm.positionTitle}
          candidateName={letterForm.letterFullName}
          letterForm={letterForm}
          setLetterForm={setLetterForm}
          letterBusy={letterBusy}
          jobPostingDoc={standaloneLetterJobPostingDoc}
          lastSavedLabel={
            linkedOffer?.updatedAt ? new Date(linkedOffer.updatedAt).toLocaleString() : null
          }
          onClose={() => router.push("/ats/offers-placement")}
          onSaveLetter={() => void handleSaveLetter()}
          formPanelTop={formPanelLinkOffer}
          applicationPicker={
            showApplicationPicker
              ? {
                  loading: applicationsLoading,
                  candidateOptions,
                  applicationOptions,
                  selectedCandidateId,
                  selectedApplicationId: jobApplicationId,
                  onCandidateChange: handleCandidateChange,
                  onApplicationChange: (id) => void applyApplicationToLetter(id),
                  emptyHint:
                    "No eligible applications. Candidate must be Applied, Screening, Interview, Shortlisted, or Offered without an existing offer.",
                }
              : null
          }
        />
      </div>
    </Fragment>
  );
}
