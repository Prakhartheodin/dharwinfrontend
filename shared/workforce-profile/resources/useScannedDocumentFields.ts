"use client";

import { useCallback, useRef, useState } from "react";
import { AxiosError } from "axios";

/**
 * The shared behaviour behind every scanned-document hook (EAD card, visa, whatever
 * follows). The document-specific parts — which endpoint to call and which form fields
 * the response maps onto — are passed in; everything else is identical between them and
 * would otherwise be copied verbatim.
 */

export type ScanValues<K extends string> = Record<K, string>;
export type ScanPatch<K extends string> = Partial<ScanValues<K>>;

export interface ScanResponse {
  needsReview: string[];
  warnings: string[];
}

export interface UseScannedDocumentFieldsOptions<K extends string, R extends ScanResponse> {
  /** Ordered form-field keys this document fills. */
  fieldOrder: readonly K[];
  /** Uploads the file and returns the parsed document. */
  scan: (file: File) => Promise<R>;
  /** Maps the response onto form-field keys. An unreadable value must map to "". */
  toValues: (res: R) => ScanValues<K>;
  /** Shown when the request itself fails and carries no message. */
  fallbackError: string;
  /** Shown when the call succeeded but nothing legible came back. */
  nothingReadMessage: string;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.message) {
    const m = err.response.data.message;
    return Array.isArray(m) ? m.map(String).join(", ") : String(m);
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Scan a document and hand back the fields to write.
 *
 * Empty fields fill straight away. A field the user already typed is NOT overwritten —
 * the scanned value is parked in `pendingReplacements` and the caller shows a replace
 * control. Nothing here writes to the server; the form's own Save does that.
 *
 * Surface-agnostic on purpose: the caller passes its current values in and applies the
 * returned patch itself, so a zustand store and plain local state can both drive it.
 *
 * @param onPatch called with the fields that should be written immediately
 */
export function useScannedDocumentFields<K extends string, R extends ScanResponse>(
  onPatch: (patch: ScanPatch<K>) => void,
  opts: UseScannedDocumentFieldsOptions<K, R>,
) {
  const { fieldOrder, scan, toValues, fallbackError, nothingReadMessage } = opts;

  const [scanning, setScanning] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [needsReview, setNeedsReview] = useState<string[]>([]);
  const [pendingReplacements, setPendingReplacements] = useState<ScanPatch<K>>({});
  /**
   * What the last scan read, regardless of which fields it was allowed to fill. The
   * scan can be triggered from a document row that sits on a different step from the
   * fields themselves, so the caller needs something to show in place.
   */
  const [lastResult, setLastResult] = useState<ScanValues<K> | null>(null);
  // A second click while the first request is in flight would race two patches into the form.
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setWarnings([]);
    setNeedsReview([]);
    setPendingReplacements({});
    setLastResult(null);
  }, []);

  const scanFile = useCallback(
    async (file: File, current: ScanValues<K>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setScanning(true);
      reset();

      try {
        const res = await scan(file);
        const incoming = toValues(res);

        const patch: ScanPatch<K> = {};
        const pending: ScanPatch<K> = {};

        for (const key of fieldOrder) {
          const next = incoming[key];
          if (!next) continue; // nothing readable for this field
          const existing = (current[key] ?? "").trim();
          if (!existing) {
            patch[key] = next; // empty field: fill it
          } else if (existing !== next) {
            pending[key] = next; // user already typed something: ask first
          }
        }

        if (Object.keys(patch).length) onPatch(patch);
        setPendingReplacements(pending);
        setNeedsReview(res.needsReview ?? []);
        setLastResult(incoming);

        const notes = [...(res.warnings ?? [])];
        if (!Object.keys(patch).length && !Object.keys(pending).length && !notes.length) {
          notes.push(nothingReadMessage);
        }
        setWarnings(notes);
      } catch (err) {
        setWarnings([apiErrorMessage(err, fallbackError)]);
      } finally {
        setScanning(false);
        inFlight.current = false;
      }
    },
    [fieldOrder, scan, toValues, fallbackError, nothingReadMessage, onPatch, reset],
  );

  const applyReplacement = useCallback(
    (key: K) => {
      setPendingReplacements((prev) => {
        const value = prev[key];
        if (value) onPatch({ [key]: value } as ScanPatch<K>);
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [onPatch],
  );

  const dismissReplacement = useCallback((key: K) => {
    setPendingReplacements((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return {
    scanning,
    warnings,
    needsReview,
    pendingReplacements,
    lastResult,
    scanFile,
    applyReplacement,
    dismissReplacement,
    reset,
  };
}
