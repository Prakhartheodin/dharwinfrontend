import type { CreateOfferPayload } from "@/shared/lib/api/offers"
import { buildEligibilityLinesFromForm, type OfferLetterFormFields } from "./OfferLetterGeneratorWorkspace"
import { letterDateStampYmd } from "./letter-date-stamp"

/** Maps workshop letter fields + CTC line items into `POST /offers` (same data model as the full-page create form). */
export function buildCreateOfferPayloadFromLetterForm(
  jobApplicationId: string,
  offerValidityDate: string,
  notes: string,
  base: number,
  hra: number,
  letterForm: OfferLetterFormFields
): CreateOfferPayload {
  const isIntern = letterForm.jobType === "INTERN_UNPAID"
  const roleResponsibilities = letterForm.rolesText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
  const trainingOutcomes = letterForm.trainingText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
  const employmentEligibilityLines =
    letterForm.eligibilityPreset === "none" ? [] : (buildEligibilityLinesFromForm(letterForm) ?? [])
  const weeklyHours: 25 | 40 =
    letterForm.jobType === "PT_25" ? 25 : letterForm.jobType === "FT_40" ? 40 : (letterForm.weeklyHours as 25 | 40)
  const g = Number(String(letterForm.annualGrossCtc).replace(/,/g, ""))

  const trimmedAppId = jobApplicationId?.trim() ?? ""
  const basePayload: CreateOfferPayload = {
    ctcBreakdown: {
      base: Number.isFinite(base) ? base : 0,
      hra: Number.isFinite(hra) ? hra : 0,
      gross: Number.isFinite(g) ? g : 0,
      currency: letterForm.ctcCurrency,
    },
    joiningDate: letterForm.joiningDate || null,
    offerValidityDate: offerValidityDate || null,
    notes: notes?.trim() ? notes.trim() : null,
    letterFullName: letterForm.letterFullName.trim() || undefined,
    letterAddress: letterForm.letterAddress.trim() || undefined,
    positionTitle: letterForm.positionTitle.trim() || undefined,
    jobType: letterForm.jobType,
    weeklyHours,
    workLocation: letterForm.workLocation.trim() || undefined,
    roleResponsibilities: roleResponsibilities.length ? roleResponsibilities : undefined,
    trainingOutcomes: isIntern && trainingOutcomes.length > 0 ? trainingOutcomes : undefined,
    academicAlignmentNote: letterForm.academicNote.trim() || undefined,
    employmentEligibilityLines: employmentEligibilityLines.length ? employmentEligibilityLines : undefined,
    supervisor: {
      firstName: letterForm.supFirst.trim() || undefined,
      lastName: letterForm.supLast.trim() || undefined,
      phone: letterForm.supPhone.trim() || undefined,
      email: letterForm.supEmail.trim() || undefined,
    },
    letterDate: letterDateStampYmd(),
  }
  if (trimmedAppId && /^[0-9a-fA-F]{24}$/.test(trimmedAppId)) {
    return { ...basePayload, jobApplicationId: trimmedAppId }
  }
  return basePayload
}
