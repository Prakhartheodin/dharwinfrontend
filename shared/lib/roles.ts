/**
 * Canonical role-name helpers. Backend role records may carry display variants like
 * "Sales Agent" / "sales agent" / "sales_agent"; normalise to snake_case before
 * comparing. Keep in sync with backend `SALES_AGENT_ROLE_NAMES`.
 */

export const SALES_AGENT_ROLE_NAME = "sales_agent";

function canonicaliseRoleName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isSalesAgentRoleName(name: string): boolean {
  return canonicaliseRoleName(name) === SALES_AGENT_ROLE_NAME;
}

export function hasSalesAgentRole(roleNames: readonly string[] | null | undefined): boolean {
  if (!roleNames) return false;
  return roleNames.some((n) => isSalesAgentRoleName(n));
}
