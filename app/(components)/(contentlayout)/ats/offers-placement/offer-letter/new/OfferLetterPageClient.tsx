"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { getDefaultWeeklyHours } from "../../offer-letter-generator-data";
import { buildCreateOfferPayloadFromLetterForm } from "../../build-create-offer-payload";
import { buildOfferLetterUpdatePayload } from "../../build-offer-letter-update-payload";
import { confirmCompensationChange } from "../../confirm-compensation-change";
import { combinedJobPostingDocText } from "../../job-posting-doc";
import { roleResponsibilitiesLinesToHtml } from "@/shared/lib/ats/jobDescriptionHtml";
import { listJobApplications, type JobApplication } from "@/shared/lib/api/jobApplications";
import {
  isJobApplicationEligibleForOffer,
  jobApplicationRecordId,
} from "@/shared/lib/ats/offer-application-eligibility";
import { findJobApplicationById, resolveOfferInterviewBypassAck } from "@/shared/lib/ats/resolve-offer-interview-bypass";
import {
  formatCandidateAddress,
  getOfferRecordId,
  mapLetterSnapshotToForm,
  mapOfferToLetterForm,
} from "../../map-offer-to-letter-form";

type Props = {
  offerIdParam: string | null;
  initialOffer: Offer | null;
  initialLoadError: string | null;
  /** True when the Server Component successfully prefetched the offer. */
  ssrHydrated?: boolean;
};

/**
 * Client island for the Offer Letter Generator.
 * Prefers SSR-hydrated `initialOffer` when present; falls back to client fetch.
 */
export default function OfferLetterPageClient({
  offerIdParam,
  initialOffer,
  initialLoadError,
  ssrHydrated = false,
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [letterForm, setLetterForm] = useState<OfferLetterFormFields>(() =>
    initialOffer ? mapOfferToLetterForm(initialOffer) : createEmptyOfferLetterForm()
  );
  const [linkedOffer, setLinkedOffer] = useState<Offer | null>(initialOffer);
  const [letterBusy, setLetterBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [jobApplicationId, setJobApplicationId] = useState("");
  /** Which letterVersions[].version is loaded in the editor (latest when null). */
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!offerIdParam || !/^[0-9a-fA-F]{24}$/.test(offerIdParam)) {
      return;
    }
    // SSR already hydrated this offer — only refresh if we have no data / error.
    if (initialOffer && getOfferRecordId(initialOffer) === offerIdParam && !initialLoadError) {
      return;
    }
    let cancelled = false;
    setLoadError(null);
    setLetterBusy(true);
    getOfferById(offerIdParam)
      .then((o) => {
        if (cancelled) return;
        setLinkedOffer(o);
        setLetterForm(mapOfferToLetterForm(o));
        setViewingVersion(null);
        const needRoleDefaults = !mapOfferToLetterForm(o).rolesText.trim();
        const isIntern = o.jobType === "INTERN_UNPAID";
        const needTrainingDefaults = isIntern && !mapOfferToLetterForm(o).trainingText.trim();
        if (needRoleDefaults || needTrainingDefaults) {
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
                  : String(d.positionOverviewHtml ?? "").trim() ||
                    roleResponsibilitiesLinesToHtml(d.roleResponsibilities),
                trainingText: f.trainingText.trim()
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
  }, [offerIdParam, initialOffer, initialLoadError]);

  // SSR path: still fill empty roles/training from defaults once.
  useEffect(() => {
    if (!initialOffer || initialLoadError) return;
    const base = mapOfferToLetterForm(initialOffer);
    const isIntern = base.jobType === "INTERN_UNPAID";
    const needRoleDefaults = !base.rolesText.trim();
    const needTrainingDefaults = isIntern && !base.trainingText.trim();
    if (!needRoleDefaults && !needTrainingDefaults) return;
    let cancelled = false;
    const offerJobId =
      (initialOffer.job as { _id?: string; id?: string } | undefined)?._id ??
      (initialOffer.job as { id?: string } | undefined)?.id;
    getOfferLetterDefaults(initialOffer.job?.title || "", offerJobId)
      .then((d) => {
        if (cancelled) return;
        setLetterForm((f) => ({
          ...f,
          rolesText: f.rolesText.trim()
            ? f.rolesText
            : String(d.positionOverviewHtml ?? "").trim() ||
              roleResponsibilitiesLinesToHtml(d.roleResponsibilities),
          trainingText: f.trainingText.trim()
            ? f.trainingText
            : isIntern
              ? String(d.trainingOutcomesHtml ?? "").trim() ||
                roleResponsibilitiesLinesToHtml(d.trainingOutcomes)
              : f.trainingText,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialOffer, initialLoadError]);

  useEffect(() => {
    if (offerIdParam) return;
    let cancelled = false;
    setApplicationsLoading(true);
    Promise.all([listJobApplications({ limit: 100 }), listOffers({ limit: 100 })])
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
      const empty = createEmptyOfferLetterForm();
      setLetterForm((prev) => ({
        ...prev,
        letterFullName: ja?.candidate?.fullName || "",
        letterAddress: ja ? formatCandidateAddress(ja.candidate) : "",
        positionTitle: "",
        rolesText: "",
        trainingText: "",
        // Job-derived like the three above: without this a previous candidate's
        // type lingers when the next job posting has no type to map from.
        jobType: empty.jobType,
        weeklyHours: empty.weeklyHours,
      }));
    },
    [jobApplications]
  );

  const applyApplicationToLetter = useCallback(
    async (applicationId: string) => {
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
      let suggestedJobType: OfferLetterJobType | undefined;
      try {
        const d = await getOfferLetterDefaults(positionTitle, jobId);
        suggestedJobType = d.suggestedJobType;
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
        // The posting's employment type seeds the offer, as it already does in
        // CreateOfferForm. Without this the letter opened on the empty-form default
        // (FT_40) no matter what the candidate applied to. A default, not a rule —
        // the user can still change it, and nothing validates the pair on save.
        ...(suggestedJobType
          ? { jobType: suggestedJobType, weeklyHours: getDefaultWeeklyHours(suggestedJobType) }
          : {}),
      }));
    },
    [jobApplications]
  );

  const letterVersions = linkedOffer?.letterVersions ?? [];
  const latestVersionNum =
    letterVersions.length > 0
      ? Math.max(...letterVersions.map((v) => Number(v.version) || 0))
      : null;

  const handleSelectVersion = useCallback(
    (version: number) => {
      if (!linkedOffer) return;
      const entry = (linkedOffer.letterVersions ?? []).find((v) => Number(v.version) === version);
      if (!entry?.snapshot) return;
      setLetterForm(mapLetterSnapshotToForm(entry.snapshot, linkedOffer));
      setViewingVersion(version === latestVersionNum ? null : version);
      setSaveError(null);
    },
    [linkedOffer, latestVersionNum]
  );

  const handleSaveLetter = useCallback(async () => {
    setSaveError(null);
    const isIntern = letterForm.jobType === "INTERN_UNPAID";
    const g = Number(String(letterForm.annualGrossCtc).replace(/,/g, ""));

    if (linkedOffer) {
      const id = getOfferRecordId(linkedOffer);
      if (!id) {
        setSaveError(
          "This offer has no id. Go back to Offers & Placement and open the letter from the list."
        );
        return;
      }

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
        setViewingVersion(null);
        const newId = getOfferRecordId(updated);
        if (newId && (!offerIdParam || offerIdParam !== newId)) {
          router.replace(
            `/ats/offers-placement/offer-letter/new?offerId=${encodeURIComponent(newId)}`,
            { scroll: false }
          );
        }
      } catch (e: unknown) {
        setSaveError(formatOfferLetterSaveError(e, "Could not save letter"));
      } finally {
        setLetterBusy(false);
      }
      return;
    }

    if (!isIntern && (!Number.isFinite(g) || g <= 0)) {
      setSaveError("Set annual gross in Compensation before saving a paid offer letter.");
      return;
    }
    if (!jobApplicationId) {
      setSaveError("Select a candidate and job applied for before saving.");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(jobApplicationId)) {
      setSaveError("Invalid job application selected.");
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
      setViewingVersion(null);
      router.replace(`/ats/offers-placement/offer-letter/new?offerId=${encodeURIComponent(id)}`, {
        scroll: false,
      });
    } catch (e: unknown) {
      setSaveError(formatOfferLetterSaveError(e, "Could not create offer or save letter"));
    } finally {
      setLetterBusy(false);
    }
  }, [letterForm, linkedOffer, offerIdParam, router, confirm, jobApplicationId, jobApplications]);

  const handleSaveLetterRef = React.useRef(handleSaveLetter);
  handleSaveLetterRef.current = handleSaveLetter;

  // Create-offer flow sets this flag so the first open saves a v1 snapshot.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("dharwin:offerLetterAutoSaveAfterOpen") !== "1") return;
    if (!linkedOffer || !getOfferRecordId(linkedOffer)) return;
    sessionStorage.removeItem("dharwin:offerLetterAutoSaveAfterOpen");
    const t = window.setTimeout(() => {
      void handleSaveLetterRef.current?.();
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when offer first hydrates
  }, [linkedOffer]);

  const standaloneLetterJobPostingDoc = useMemo(
    () => combinedJobPostingDocText(linkedOffer?.job) ?? null,
    [linkedOffer]
  );

  const loadingOfferFromId = Boolean(offerIdParam && letterBusy && !loadError && !linkedOffer);
  const showApplicationPicker = !linkedOffer && !offerIdParam;

  const versionPicker = linkedOffer
    ? {
        versions:
          letterVersions.length > 0
            ? [...letterVersions]
                .sort((a, b) => Number(b.version) - Number(a.version))
                .map((v) => {
                  const by =
                    v.savedBy && typeof v.savedBy === "object"
                      ? v.savedBy.name || v.savedBy.email || ""
                      : "";
                  const when = v.savedAt ? new Date(v.savedAt).toLocaleString() : "";
                  const latest = Number(v.version) === latestVersionNum;
                  return {
                    version: Number(v.version),
                    label: `v${v.version}${latest ? " (current)" : ""}${when ? ` · ${when}` : ""}${
                      by ? ` · ${by}` : ""
                    }`,
                  };
                })
            : [{ version: 0, label: "No versions yet — Save letter to create v1" }],
        selectedVersion: viewingVersion ?? latestVersionNum ?? 0,
        onSelectVersion: handleSelectVersion,
        emptyHint: letterVersions.length === 0,
      }
    : null;

  const formPanelLinkOffer =
    !linkedOffer && (loadingOfferFromId || (loadError && offerIdParam)) ? (
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

  const formPanelTop = (
    <>
      {formPanelLinkOffer}
      {ssrHydrated && linkedOffer ? (
        <div
          className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
          role="status"
          data-ssr-hydrated="true"
        >
          Offer loaded on the server (SSR). Letter versions appear in the top bar after you Save
          letter.
        </div>
      ) : null}
      {viewingVersion != null && latestVersionNum != null && viewingVersion !== latestVersionNum ? (
        <div
          className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          role="status"
        >
          Viewing v{viewingVersion}. Edit and use <strong>Save letter</strong> to create a new
          version (history is not overwritten).
        </div>
      ) : null}
      {saveError ? (
        <div
          className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
          role="alert"
        >
          {saveError}
        </div>
      ) : null}
    </>
  );

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
          formPanelTop={formPanelTop}
          versionPicker={versionPicker}
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
