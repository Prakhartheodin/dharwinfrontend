"use client";

import React, { useCallback, useEffect, useState } from "react";
import PayrollDetailsForm from "@/shared/components/payroll/PayrollDetailsForm";
import ConfirmDiscardDialog from "@/shared/components/ConfirmDiscardDialog";
import {
  getPayrollDetails,
  requestPayrollDetails,
  cancelPayrollRequest,
  submitPayrollDetails,
  verifyPayrollDetails,
  revealAccountNumber,
  type PayrollDetailView,
  type PayrollSubmitPayload,
} from "@/shared/lib/api/payrollDetails";
import type { PayrollCountry } from "@/shared/lib/payroll/spec";
import {
  INVALID_FIELD,
  BTN_44,
} from "@/app/(components)/(contentlayout)/ats/pre-boarding/modals/PreBoardingDocumentsModal";

interface Props {
  candidateId: string;
  candidateName: string;
  canEdit: boolean;
  canCreate: boolean;
  canReveal: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

function formatWhen(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function countryLabel(code: PayrollCountry): string {
  return code === "US" ? "United States" : "India";
}

const PayrollDetailsTab: React.FC<Props> = ({
  candidateId,
  candidateName,
  canEdit,
  canCreate,
  canReveal,
  onDirtyChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<PayrollDetailView | null>(null);
  const [requestCountry, setRequestCountry] = useState<PayrollCountry | "">("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestFieldError, setRequestFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enterOnBehalf, setEnterOnBehalf] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPayrollDetails(candidateId);
      setRecord(data);
      setRevealed(null);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Failed to load payroll details");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRequest = async (existingCountry?: PayrollCountry) => {
    const country = existingCountry || requestCountry;
    if (!country) {
      setRequestFieldError("Select a payroll country before requesting details.");
      return;
    }
    setRequestFieldError(null);
    setBusy(true);
    setError(null);
    try {
      const data = await requestPayrollDetails(candidateId, {
        payrollCountry: country,
        requestNotes: requestNotes.trim() || undefined,
      });
      setRecord(data);
      onDirtyChange(false);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelConfirm = async () => {
    setCancelBusy(true);
    setError(null);
    try {
      await cancelPayrollRequest(candidateId);
      setCancelConfirmOpen(false);
      setEnterOnBehalf(false);
      onDirtyChange(false);
      await load();
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Cancel failed");
    } finally {
      setCancelBusy(false);
    }
  };

  const handleSubmitOnBehalf = async (payload: PayrollSubmitPayload) => {
    setError(null);
    const data = await submitPayrollDetails(candidateId, payload);
    setRecord(data);
    setEnterOnBehalf(false);
    onDirtyChange(false);
  };

  const handleApprove = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await verifyPayrollDetails(candidateId, { approved: true });
      setRecord(data);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      setRejectError("Enter a reason of at least 3 characters.");
      return;
    }
    setRejectError(null);
    setBusy(true);
    setError(null);
    try {
      const data = await verifyPayrollDetails(candidateId, { approved: false, rejectionReason: reason });
      setRecord(data);
      setRejectOpen(false);
      setRejectReason("");
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReveal = async () => {
    setBusy(true);
    setError(null);
    try {
      const number = await revealAccountNumber(candidateId);
      setRevealed(number);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Reveal failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-live="polite">
        <div className="h-4 w-1/3 rounded bg-slate-200/80 dark:bg-white/10" />
        <div className="h-20 rounded-lg bg-slate-100/80 dark:bg-white/5" />
        <div className="h-20 rounded-lg bg-slate-100/80 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <p className="mb-2">{error}</p>
          <button type="button" className={`ti-btn ti-btn-light ${BTN_44}`} onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {!record ? (
        <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <h5 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Request bank details</h5>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Choose the payroll country. The offer currency and profile address did not settle it, so HR must pick
            before the candidate can be asked.
          </p>
          {canCreate ? (
            <>
              <fieldset className="mb-3">
                <legend className="form-label">Payroll country</legend>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "US", label: "United States" },
                    { value: "IN", label: "India" },
                  ] as const).map((opt) => {
                    const checked = requestCountry === opt.value;
                    return (
                      <label
                        key={opt.value}
                        htmlFor={`payroll-request-country-${opt.value}`}
                        className={`${BTN_44} cursor-pointer rounded-lg border px-3 ${
                          checked
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-slate-200/90 bg-white dark:border-white/10 dark:bg-bodybg"
                        }`}
                      >
                        <input
                          id={`payroll-request-country-${opt.value}`}
                          type="radio"
                          name="payroll-request-country"
                          value={opt.value}
                          checked={checked}
                          onChange={() => {
                            setRequestCountry(opt.value);
                            setRequestFieldError(null);
                          }}
                          className="me-2"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
                {requestFieldError ? (
                  <p role="alert" className="mb-0 mt-1 text-xs text-rose-700 dark:text-rose-300">
                    {requestFieldError}
                  </p>
                ) : null}
              </fieldset>
              <div className="mb-3">
                <label className="form-label" htmlFor="payroll-request-notes">
                  Notes for the candidate (optional)
                </label>
                <textarea
                  id="payroll-request-notes"
                  className="form-control"
                  maxLength={500}
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`ti-btn ti-btn-primary ${BTN_44}`}
                onClick={() => void handleRequest()}
              >
                {busy ? "Requesting…" : "Request bank details"}
              </button>
            </>
          ) : (
            <p className="mb-0 text-sm text-slate-500 dark:text-slate-400">
              You do not have permission to request payroll details.
            </p>
          )}
        </div>
      ) : null}

      {record?.status === "requested" ? (
        <div className="space-y-4">
          <p className="mb-0 text-sm text-slate-700 dark:text-slate-300">
            Requested {formatWhen(record.requestedAt)} — waiting on {candidateName}. Payroll country:{" "}
            {countryLabel(record.payrollCountry)}
            {record.countrySource === "offerCurrency"
              ? " (from offer currency)"
              : record.countrySource === "profileAddress"
                ? " (from profile address)"
                : " (chosen by HR)"}
            .
          </p>
          {record.requestNotes ? (
            <p className="mb-0 rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.02]">
              {record.requestNotes}
            </p>
          ) : null}
          {canCreate ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`ti-btn ti-btn-light ${BTN_44}`}
                disabled={busy}
                onClick={() => void handleRequest(record.payrollCountry)}
              >
                Re-send request
              </button>
              <button
                type="button"
                className={`ti-btn ti-btn-danger ${BTN_44}`}
                disabled={busy || cancelBusy}
                onClick={() => setCancelConfirmOpen(true)}
              >
                Cancel request
              </button>
            </div>
          ) : null}
          {canEdit ? (
            <div>
              <button
                type="button"
                className={`ti-btn ti-btn-light ${BTN_44}`}
                aria-expanded={enterOnBehalf}
                onClick={() => setEnterOnBehalf((v) => !v)}
              >
                Enter on their behalf
              </button>
              {enterOnBehalf ? (
                <div className="mt-3">
                  <PayrollDetailsForm
                    country={record.payrollCountry}
                    submitLabel="Submit bank details"
                    onDirtyChange={onDirtyChange}
                    onSubmit={handleSubmitOnBehalf}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {record && (record.status === "submitted" || record.status === "verified" || record.status === "rejected") ? (
        <div className="space-y-3">
          {record.status === "verified" ? (
            <p className="mb-0 text-sm text-emerald-800 dark:text-emerald-200">
              Verified {formatWhen(record.verifiedAt)}
            </p>
          ) : null}
          {record.status === "rejected" ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
            >
              {record.rejectionReason || "Rejected"}
            </div>
          ) : null}
          {record.status === "submitted" ? (
            <p className="mb-0 text-sm text-slate-700 dark:text-slate-300">
              Submitted {formatWhen(record.submittedAt)} — under review. Payroll country:{" "}
              {countryLabel(record.payrollCountry)}.
            </p>
          ) : null}
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Account holder</dt>
              <dd className="mb-0">{record.bank.accountHolderName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Bank</dt>
              <dd className="mb-0">{record.bank.bankName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Account type</dt>
              <dd className="mb-0">{record.bank.accountType || "—"}</dd>
            </div>
            {record.payrollCountry === "US" ? (
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Routing number</dt>
                <dd className="mb-0">{record.bank.routingNumber || "—"}</dd>
              </div>
            ) : (
              <>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">IFSC</dt>
                  <dd className="mb-0">{record.bank.ifsc || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Branch</dt>
                  <dd className="mb-0">{record.bank.branchName || "—"}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Account number</dt>
              <dd className="mb-0 font-mono">
                {revealed || record.bank.accountNumberMasked || "—"}
              </dd>
            </div>
          </dl>
          {record.status === "submitted" && canReveal ? (
            <button type="button" className={`ti-btn ti-btn-light ${BTN_44}`} onClick={() => void handleReveal()}>
              Reveal account number
            </button>
          ) : null}
          {record.status === "submitted" && canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`ti-btn ti-btn-success ${BTN_44}`} onClick={() => void handleApprove()}>
                Approve
              </button>
              <button
                type="button"
                className={`ti-btn ti-btn-danger ${BTN_44}`}
                onClick={() => setRejectOpen((v) => !v)}
                aria-expanded={rejectOpen}
              >
                Reject
              </button>
            </div>
          ) : null}
          {record.status === "submitted" && rejectOpen ? (
            <div>
              <label className="form-label" htmlFor="payroll-reject-reason">
                Rejection reason
              </label>
              <textarea
                id="payroll-reject-reason"
                className={`form-control ${rejectError ? INVALID_FIELD : ""}`}
                minLength={3}
                maxLength={500}
                rows={3}
                value={rejectReason}
                aria-invalid={rejectError ? true : undefined}
                aria-describedby={rejectError ? "payroll-reject-reason-error" : undefined}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              {rejectError ? (
                <p id="payroll-reject-reason-error" role="alert" className="mb-2 mt-1 text-xs text-rose-700 dark:text-rose-300">
                  {rejectError}
                </p>
              ) : null}
              <button type="button" className={`ti-btn ti-btn-danger ${BTN_44} mt-2`} onClick={() => void handleReject()}>
                Send back for correction
              </button>
            </div>
          ) : null}
          {(record.status === "verified" || record.status === "rejected") && canCreate ? (
            <button
              type="button"
              className={`ti-btn ti-btn-light ${BTN_44}`}
              onClick={() => void handleRequest(record.payrollCountry)}
            >
              Request again
            </button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDiscardDialog
        open={cancelConfirmOpen}
        busy={cancelBusy}
        title="Cancel bank details request?"
        description="The candidate will no longer see this request. Nothing has been submitted. This cannot be undone."
        confirmLabel="Cancel request"
        confirmBusyLabel="Cancelling…"
        cancelLabel="Keep request"
        onConfirm={() => void handleCancelConfirm()}
        onCancel={() => {
          if (!cancelBusy) setCancelConfirmOpen(false);
        }}
      />
    </div>
  );
};

export default PayrollDetailsTab;
