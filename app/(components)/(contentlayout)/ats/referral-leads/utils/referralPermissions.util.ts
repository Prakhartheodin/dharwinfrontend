import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";

export function canManageCandidatesFromPermissions(permissions: string[]): boolean {
  return permissions.some(
    (p) =>
      p.includes("ats.candidates:view,create,edit,delete") ||
      p.includes("candidates.manage") ||
      p === "candidates.manage"
  );
}

export function hasPermission(permissions: string[], key: string): boolean {
  return permissions.some((p) => p === key || p.includes(key));
}

/** Same rule as backend `getReferralLeadsStats`: org-wide top referrer only for Administrator / Agent (not sales_agent). */
export function canSeeReferralLeaderboardFromRoles(
  roleNames: string[],
  isAdministrator: boolean,
  isPlatformSuperUser: boolean
): boolean {
  if (isPlatformSuperUser || isAdministrator) return true;
  return roleNames.some((n) => {
    const norm = n.trim().toLowerCase().replace(/\s+/g, "_");
    return norm === "agent";
  });
}

export function attributionLabel(lead: ReferralLeadRow): { text: string; tone: "ok" | "warn" | "muted" } {
  if (lead.referralAttributionAnonymised) {
    return { text: "Attribution anonymised", tone: "warn" };
  }
  if (lead.attributionLockedAt) {
    return { text: "Attribution confirmed", tone: "ok" };
  }
  if (lead.referredAt) {
    return { text: "Attribution pending", tone: "muted" };
  }
  return { text: "—", tone: "muted" };
}
