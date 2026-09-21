"use client";

import React, { useCallback, useEffect, useState } from "react";
import PayrollDetailsForm from "@/shared/components/payroll/PayrollDetailsForm";
import {
  getMyPayrollDetails,
  submitMyPayrollDetails,
  type PayrollDetailView,
  type PayrollSubmitPayload,
} from "@/shared/lib/api/payrollDetails";
import { BTN_44 } from "@/app/(components)/(contentlayout)/ats/pre-boarding/modals/PreBoardingDocumentsModal";

function formatWhen(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function countryLabel(code: string): string {
  return code === "US" ? "United States" : code === "IN" ? "India" : code;
}

function nonSensitiveInitial(record: PayrollDetailView): Record<string, string> {
  const bank = record.bank || ({} as PayrollDetailView["bank"]);
  const next: Record<string, string> = {};
  if (bank.accountHolderName) next.accountHolderName = bank.accountHolderName;
  if (bank.bankName) next.bankName = bank.bankName;
  if (bank.accountType) next.accountType = bank.accountType;
  if (bank.routingNumber) next.routingNumber = bank.routingNumber;
  if (bank.ifsc) next.ifsc = bank.ifsc;
  if (bank.branchName) next.branchName = bank.branchName;
  return next;
}

const PayrollDetailsActionCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<PayrollDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyPayrollDetails();
      setRecord(data);
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message || ax?.message || "Failed to load payroll details");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (payload: PayrollSubmitPayload) => {
    setError(null);
    const data = await submitMyPayrollDetails(payload);
    setRecord(data);
  };

  if (loading) return null;
  if (!record && !error) return null;

  if (error && !record) {
    return (
      <div className="mb-6 rounded-xl border border-rose-200/80 bg-rose-50/70 px-5 py-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
        <p className="mb-2">{error}</p>
        <button type="button" className={`ti-btn ti-btn-light ${BTN_44}`} onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!record) return null;

  const needsAction = record.status === "requested" || record.status === "rejected";

  return (
    <div className="mb-6 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-bodybg">
      <div className="flex items-start gap-3 border-b border-amber-200/60 px-5 py-4 dark:border-amber-900/30">
        <span
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
          aria-hidden
        >
          <i className="ri-bank-line text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="mb-0.5 text-base font-semibold text-amber-900 dark:text-amber-100">
            {needsAction ? "Action needed on your bank details" : "Bank & payroll details"}
          </h2>
          <p className="mb-0 text-sm text-amber-800/80 dark:text-amber-200/80">
            {record.status === "requested" && "HR has asked you to submit bank details for payroll."}
            {record.status === "submitted" && `Submitted ${formatWhen(record.submittedAt)} — under review`}
            {record.status === "rejected" && "Your details were sent back. Please correct and resubmit."}
            {record.status === "verified" && "Your bank details have been verified."}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {error ? (
          <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {record.status === "requested" ? (
          <>
            {record.requestNotes ? (
              <p className="mb-0 rounded-lg border border-amber-200/60 bg-white px-3 py-2 text-sm dark:border-amber-900/30 dark:bg-bodybg">
                {record.requestNotes}
              </p>
            ) : null}
            <p className="mb-0 text-sm text-defaulttextcolor dark:text-white/80">
              Payroll country: {countryLabel(record.payrollCountry)} (set by HR). Contact HR if this is wrong.
            </p>
            <PayrollDetailsForm
              country={record.payrollCountry}
              submitLabel="Submit bank details"
              onSubmit={handleSubmit}
            />
          </>
        ) : null}

        {record.status === "rejected" ? (
          <>
            <div
              role="alert"
              className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
            >
              {record.rejectionReason || "Rejected"}
            </div>
            <PayrollDetailsForm
              country={record.payrollCountry}
              initial={nonSensitiveInitial(record)}
              submitLabel="Resubmit bank details"
              onSubmit={handleSubmit}
            />
          </>
        ) : null}

        {(record.status === "submitted" || record.status === "verified") ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-defaulttextcolor/60 dark:text-white/50">Account holder</dt>
              <dd className="mb-0">{record.bank.accountHolderName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-defaulttextcolor/60 dark:text-white/50">Bank</dt>
              <dd className="mb-0">{record.bank.bankName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-defaulttextcolor/60 dark:text-white/50">Account number</dt>
              <dd className="mb-0 font-mono">{record.bank.accountNumberMasked || "—"}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
};

export default PayrollDetailsActionCard;
