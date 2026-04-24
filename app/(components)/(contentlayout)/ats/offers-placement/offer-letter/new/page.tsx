"use client";

import React, { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import {
  OfferLetterGeneratorWorkspace,
  createEmptyOfferLetterForm,
  type OfferLetterFormFields,
} from "../../OfferLetterGeneratorWorkspace";
import {
  createOffer,
  downloadOfferLetterFile,
  generateOfferLetterPdf,
  formatOfferLetterPdfError,
  getOfferById,
  getOfferLetterDefaults,
  updateOffer,
  type Offer,
  type OfferLetterJobType,
} from "@/shared/lib/api/offers";
import { buildCreateOfferPayloadFromLetterForm } from "../../build-create-offer-payload";
import { buildOfferLetterUpdatePayload } from "../../build-offer-letter-update-payload";
import { detectEligibilityPreset } from "../../offer-letter-generator-data";

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
 * Standalone letter: same server PDF flow as Offers & Placement (`generateOfferLetterPdf` / `downloadOfferLetterFile`).
 * Open with `?offerId=` to continue an offer, or fill the form and use Generate to create an offer and PDF (no job application required).
 */
export default function NewOfferLetterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerIdParam = searchParams.get("offerId");

  const [letterForm, setLetterForm] = useState(() => createEmptyOfferLetterForm());
  const [linkedOffer, setLinkedOffer] = useState<Offer | null>(null);
  const [letterBusy, setLetterBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          eligibilityPreset = "opt_regular";
        }
        if (!isIntern && eligibilityPreset === "none" && eligLines.length === 0) {
          eligibilityPreset = "opt_regular";
        }
        const eligibilityText = eligibilityPreset === "custom" ? eligLines.join("\n") : "";
        const base: OfferLetterFormFields = {
          letterFullName: o.letterFullName || c?.fullName || "",
          letterAddress: o.letterAddress || addr || "",
          positionTitle: o.positionTitle || o.job?.title || "",
          joiningDate: o.joiningDate ? String(o.joiningDate).slice(0, 10) : "",
          letterDate: o.letterDate ? String(o.letterDate).slice(0, 10) : "",
          jobType: jt,
          weeklyHours: (o.weeklyHours === 25 ? 25 : 40) as 25 | 40,
          workLocation: o.workLocation || "Remote (USA)",
          rolesText: o.roleResponsibilities && o.roleResponsibilities.length ? o.roleResponsibilities.join("\n") : "",
          trainingText: o.trainingOutcomes && o.trainingOutcomes.length ? o.trainingOutcomes.join("\n") : "",
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
          getOfferLetterDefaults(o.job?.title || "")
            .then((d) => {
              if (cancelled) return;
              setLetterForm((f) => ({
                ...f,
                rolesText: f.rolesText.trim() ? f.rolesText : d.roleResponsibilities.join("\n"),
                trainingText:
                  f.trainingText.trim() ? f.trainingText : isIntern ? d.trainingOutcomes.join("\n") : f.trainingText,
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

  const handleGeneratePdf = useCallback(async () => {
    const isIntern = letterForm.jobType === "INTERN_UNPAID";
    const g = Number(String(letterForm.annualGrossCtc).replace(/,/g, ""));

    if (linkedOffer) {
      const id = getOfferRecordId(linkedOffer);
      if (!id) {
        alert("This offer has no id. Go back to Offers & Placement and open the letter from the list.");
        return;
      }
      setLetterBusy(true);
      try {
        const patched = await updateOffer(id, buildOfferLetterUpdatePayload(letterForm, linkedOffer));
        const genId = getOfferRecordId(patched) || id;
        const updated = await generateOfferLetterPdf(genId);
        setLinkedOffer(updated);
        const newId = getOfferRecordId(updated);
        if (newId && (!offerIdParam || offerIdParam !== newId)) {
          router.replace(`/ats/offers-placement/offer-letter/new?offerId=${encodeURIComponent(newId)}`, {
            scroll: false,
          });
        }
      } catch (e: unknown) {
        alert(formatOfferLetterPdfError(e, "Could not generate PDF"));
      } finally {
        setLetterBusy(false);
      }
      return;
    }

    if (!isIntern && (!Number.isFinite(g) || g <= 0)) {
      alert("Set annual gross in Compensation before generating a paid offer PDF.");
      return;
    }
    setLetterBusy(true);
    try {
      const created = await createOffer(buildCreateOfferPayloadFromLetterForm("", "", "", 0, 0, letterForm));
      const id = getOfferRecordId(created);
      if (!id) {
        throw new Error("Create offer returned no id");
      }

      setLinkedOffer(created);
      const patched = await updateOffer(id, buildOfferLetterUpdatePayload(letterForm, created));
      const genId = getOfferRecordId(patched) || id;
      const updated = await generateOfferLetterPdf(genId);
      setLinkedOffer(updated);
      router.replace(`/ats/offers-placement/offer-letter/new?offerId=${encodeURIComponent(genId)}`, { scroll: false });
    } catch (e: unknown) {
      alert(formatOfferLetterPdfError(e, "Could not create offer or generate PDF"));
    } finally {
      setLetterBusy(false);
    }
  }, [letterForm, linkedOffer, offerIdParam, router]);

  const handleDownload = useCallback(async () => {
    if (!linkedOffer?.offerLetterKey) {
      return;
    }
    const id = getOfferRecordId(linkedOffer);
    if (!id) {
      alert("Missing offer id. Return to Offers & Placement and open the letter from the list.");
      return;
    }
    setLetterBusy(true);
    try {
      const blob = await downloadOfferLetterFile(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Offer-Letter-${linkedOffer.offerCode || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e as Error)?.message ||
        "Download failed";
      alert(msg);
    } finally {
      setLetterBusy(false);
    }
  }, [linkedOffer]);

  const loadingOfferFromId = Boolean(offerIdParam && letterBusy && !loadError);
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

  return (
    <Fragment>
      <Seo fullDocumentTitle="Offer Letter" />
      <div className="offer-letter-page-shell w-full min-h-[32rem] h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-3rem)] overflow-hidden [&>div]:h-full [&>div]:min-h-0">
        <OfferLetterGeneratorWorkspace
          offerCode={linkedOffer?.offerCode || "—"}
          jobTitle={letterForm.positionTitle}
          candidateName={letterForm.letterFullName}
          letterForm={letterForm}
          setLetterForm={setLetterForm}
          letterBusy={letterBusy}
          lastGeneratedLabel={
            linkedOffer?.offerLetterGeneratedAt
              ? new Date(linkedOffer.offerLetterGeneratedAt).toLocaleString()
              : null
          }
          hasPdf={Boolean(linkedOffer?.offerLetterKey)}
          onClose={() => router.push("/ats/offers-placement")}
          onGeneratePdf={() => void handleGeneratePdf()}
          onDownload={() => void handleDownload()}
          formPanelTop={formPanelLinkOffer}
        />
      </div>
    </Fragment>
  );
}
