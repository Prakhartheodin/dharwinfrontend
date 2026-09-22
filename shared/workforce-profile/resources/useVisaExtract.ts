"use client";

import { useMemo } from "react";
import * as authApi from "@/shared/lib/api/auth";
import {
  useScannedDocumentFields,
  type ScanPatch,
  type ScanValues,
} from "./useScannedDocumentFields";

export type VisaFieldKey = "visaNumber" | "visaIssueDate" | "visaExpiryDate";
export type VisaCurrentValues = ScanValues<VisaFieldKey>;
/** What the caller should write into its own form state. */
export type VisaPatch = ScanPatch<VisaFieldKey>;

const FIELD_ORDER: readonly VisaFieldKey[] = ["visaNumber", "visaIssueDate", "visaExpiryDate"];

/**
 * Scan a visa foil and hand back the fields to write.
 *
 * All the behaviour lives in useScannedDocumentFields, which the EAD scanner shares;
 * this only names the endpoint and the three form fields a visa fills.
 *
 * @param onPatch called with the fields that should be written immediately
 */
export function useVisaExtract(onPatch: (patch: VisaPatch) => void) {
  const options = useMemo(
    () => ({
      fieldOrder: FIELD_ORDER,
      scan: (file: File) => authApi.extractVisa(file),
      toValues: (res: authApi.ExtractVisaResponse): VisaCurrentValues => ({
        visaNumber: res.fields.visaNumber ?? "",
        visaIssueDate: res.fields.issueDate ?? "",
        visaExpiryDate: res.fields.expiryDate ?? "",
      }),
      fallbackError: "Could not read the visa. Try a clearer photo, or type the details in by hand.",
      nothingReadMessage: "Nothing readable was found on that image. Try a straighter, brighter photo.",
    }),
    [],
  );

  const scan = useScannedDocumentFields<VisaFieldKey, authApi.ExtractVisaResponse>(
    onPatch,
    options,
  );

  return { ...scan, scanVisa: scan.scanFile };
}
