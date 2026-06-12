export type AttributionJobScope = "candidate" | "job";

export type QuickStatusFilter =
  | "hiredOnly"
  | "convertedEmployees"
  | "activeEmployees"
  | "resignedEmployees"
  | "pendingReferrals"
  | null;

export function scopeLabel(scope: AttributionJobScope | null | undefined, jobTitle?: string | null): string {
  if (scope === "candidate") return "All jobs";
  if (scope === "job") return jobTitle?.trim() || "Specific job";
  return "—";
}
