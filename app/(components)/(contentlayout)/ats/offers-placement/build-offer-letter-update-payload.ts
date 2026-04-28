import type { Offer, UpdateOfferPayload } from "@/shared/lib/api/offers"
import { buildEligibilityLinesFromForm, type OfferLetterFormFields } from "./OfferLetterGeneratorWorkspace"
import { letterDateStampYmd } from "./letter-date-stamp"

/**
 * PATCH /offers/:id body from the letter workshop form (same as Offers & Placement modal).
 * `offerForCtc` supplies base/HRA line items from the saved offer; if null, defaults them to 0.
 */
export function buildOfferLetterUpdatePayload(
  letterForm: OfferLetterFormFields,
  offerForCtc: Offer | null
): UpdateOfferPayload {
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
  const payload: UpdateOfferPayload = {
    letterFullName: letterForm.letterFullName.trim() || undefined,
    letterAddress: letterForm.letterAddress.trim() || undefined,
    positionTitle: letterForm.positionTitle.trim() || undefined,
    jobType: letterForm.jobType,
    weeklyHours,
    workLocation: letterForm.workLocation.trim() || undefined,
    roleResponsibilities,
    trainingOutcomes,
    academicAlignmentNote: letterForm.academicNote.trim() || undefined,
    employmentEligibilityLines,
    supervisor: {
      firstName: letterForm.supFirst.trim() || undefined,
      lastName: letterForm.supLast.trim() || undefined,
      phone: letterForm.supPhone.trim() || undefined,
      email: letterForm.supEmail.trim() || undefined,
    },
    joiningDate: letterForm.joiningDate ? letterForm.joiningDate : null,
    /** Always the calendar day of save (not edited in the form). */
    letterDate: letterDateStampYmd(),
  }
  if (letterForm.jobType !== "INTERN_UNPAID") {
    const g = Number(String(letterForm.annualGrossCtc).replace(/,/g, ""))
    const cb = offerForCtc?.ctcBreakdown
    if (Number.isFinite(g) && g >= 0) {
      payload.ctcBreakdown = {
        base: cb?.base ?? 0,
        hra: cb?.hra ?? 0,
        specialAllowances: cb?.specialAllowances ?? 0,
        otherAllowances: cb?.otherAllowances ?? 0,
        gross: g,
        currency: letterForm.ctcCurrency || cb?.currency || "USD",
      }
      if (g > 0) {
        payload.compensationNarrative = ""
      }
    }
  }
  return payload
}
