"use client";

import { useCallback, useRef, useState } from "react";
import { AxiosError } from "axios";
import * as authApi from "@/shared/lib/api/auth";

export type EadFieldKey = "eadCardNumber" | "eadValidFrom" | "eadValidTo";
export type EadCurrentValues = Record<EadFieldKey, string>;

/** What the caller should write into its own form state. */
export type EadPatch = Partial<EadCurrentValues>;

const FIELD_ORDER: EadFieldKey[] = ["eadCardNumber", "eadValidFrom", "eadValidTo"];

function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data?.message) {
    const m = err.response.data.message;
    return Array.isArray(m) ? m.map(String).join(", ") : String(m);
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not read the card. Try a clearer photo, or type the details in by hand.";
}

/**
 * Scan an EAD (I-766) card and hand back the fields to write.
 *
 * Empty fields fill straight away. A field the user already typed is NOT overwritten —
 * the scanned value is parked in `pendingReplacements` and the caller shows a replace
 * control. Nothing here writes to the server; the form's own Save does that.
 *
 * Surface-agnostic on purpose: the caller passes its current values in and applies the
 * returned patch itself, so the wizard's zustand store and the admin form's local state
 * can both drive it without this hook knowing which it is talking to.
 *
 * @param onPatch called with the fields that should be written immediately
 */
export function useEadCardExtract(onPatch: (patch: EadPatch) => void) {
  const [scanning, setScanning] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [needsReview, setNeedsReview] = useState<string[]>([]);
  const [pendingReplacements, setPendingReplacements] = useState<EadPatch>({});
  // A second click while the first request is in flight would race two patches into the form.
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setWarnings([]);
    setNeedsReview([]);
    setPendingReplacements({});
  }, []);

  const scanCard = useCallback(
    async (file: File, current: EadCurrentValues) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setScanning(true);
      reset();

      try {
        const res = await authApi.extractEadCard(file);

        const incoming: EadCurrentValues = {
          eadCardNumber: res.fields.cardNumber ?? "",
          eadValidFrom: res.fields.validFrom ?? "",
          eadValidTo: res.fields.validTo ?? "",
        };

        const patch: EadPatch = {};
        const pending: EadPatch = {};

        for (const key of FIELD_ORDER) {
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

        const notes = [...(res.warnings ?? [])];
        if (!Object.keys(patch).length && !Object.keys(pending).length && !notes.length) {
          notes.push("Nothing readable was found on that image. Try a straighter, brighter photo.");
        }
        setWarnings(notes);
      } catch (err) {
        setWarnings([apiErrorMessage(err)]);
      } finally {
        setScanning(false);
        inFlight.current = false;
      }
    },
    [onPatch, reset],
  );

  const applyReplacement = useCallback(
    (key: EadFieldKey) => {
      setPendingReplacements((prev) => {
        const value = prev[key];
        if (value) onPatch({ [key]: value } as EadPatch);
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [onPatch],
  );

  const dismissReplacement = useCallback((key: EadFieldKey) => {
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
    scanCard,
    applyReplacement,
    dismissReplacement,
    reset,
  };
}
