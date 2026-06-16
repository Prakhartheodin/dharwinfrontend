"use client";

import type { CallRecord } from "@/shared/lib/api/bolna";

const yesNo = (v?: boolean | null) =>
  v === true ? "Yes" : v === false ? "No" : "—";

const interestLabel: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not interested",
  withdrew: "Withdrew",
};

const outcomeLabel: Record<string, string> = {
  fully_confirmed: "Fully confirmed",
  partially_confirmed: "Partially confirmed",
  refused: "Refused",
  voicemail: "Voicemail",
  no_data: "No data",
};

export default function CallVerificationPanel({ record }: { record: CallRecord }) {
  const v = record.verification;
  const q = record.callQuality;
  const needsReview = q?.status === "needs_review";

  const rows: Array<[string, string]> = [
    ["Name confirmed", yesNo(v?.nameConfirmed)],
    ["Corrected name", v?.correctedName || "—"],
    ["Job confirmed", yesNo(v?.jobConfirmed)],
    ["Availability", v?.availability || "—"],
    ["Location", v?.currentLocation || "—"],
    ["Interest", v?.stillInterested ? interestLabel[v.stillInterested] : "—"],
    ["Outcome", v?.callOutcome ? outcomeLabel[v.callOutcome] : "—"],
  ];

  return (
    <div className="rounded-md border border-defaultborder/60 dark:border-white/10 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Verification summary</span>
        {needsReview && (
          <span
            title={(q?.reasons || []).join(", ")}
            className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
          >
            Needs review
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-defaulttextcolor/60">{label}</dt>
            <dd className={value === "Withdrew" ? "font-semibold text-red-600" : ""}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
