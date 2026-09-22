"use client";

import { useMemo } from "react";
import * as authApi from "@/shared/lib/api/auth";
import {
  useScannedDocumentFields,
  type ScanPatch,
  type ScanValues,
} from "./useScannedDocumentFields";

export type EadFieldKey = "eadCardNumber" | "eadValidFrom" | "eadValidTo";
export type EadCurrentValues = ScanValues<EadFieldKey>;
/** What the caller should write into its own form state. */
export type EadPatch = ScanPatch<EadFieldKey>;

const FIELD_ORDER: readonly EadFieldKey[] = ["eadCardNumber", "eadValidFrom", "eadValidTo"];

/**
 * Scan an EAD (I-766) card and hand back the fields to write.
 *
 * All the behaviour lives in useScannedDocumentFields, which the visa scanner shares;
 * this only names the endpoint and the three form fields an EAD fills.
 *
 * @param onPatch called with the fields that should be written immediately
 */
export function useEadCardExtract(onPatch: (patch: EadPatch) => void) {
  const options = useMemo(
    () => ({
      fieldOrder: FIELD_ORDER,
      scan: (file: File) => authApi.extractEadCard(file),
      toValues: (res: authApi.ExtractEadCardResponse): EadCurrentValues => ({
        eadCardNumber: res.fields.cardNumber ?? "",
        eadValidFrom: res.fields.validFrom ?? "",
        eadValidTo: res.fields.validTo ?? "",
      }),
      fallbackError: "Could not read the card. Try a clearer photo, or type the details in by hand.",
      nothingReadMessage: "Nothing readable was found on that image. Try a straighter, brighter photo.",
    }),
    [],
  );

  const scan = useScannedDocumentFields<EadFieldKey, authApi.ExtractEadCardResponse>(
    onPatch,
    options,
  );

  // scanCard rather than scanFile: the two call sites read better naming the document.
  return { ...scan, scanCard: scan.scanFile };
}
