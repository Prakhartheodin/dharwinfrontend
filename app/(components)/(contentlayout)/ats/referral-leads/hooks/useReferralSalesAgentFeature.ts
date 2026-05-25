"use client";

import { useMemo } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { isSalesAgentRoleName } from "@/shared/lib/roles";
import { canManageCandidatesFromPermissions, hasPermission } from "../utils/referralPermissions.util";

/**
 * Org/admin attribution UI (extra stats, columns, assign/change/revoke).
 * Sales-agent role users always get the original referral-leads page.
 */
export function useReferralSalesAgentFeatureFlag(): boolean {
  const { permissions, permissionsLoaded, capabilities, roleNames } = useAuth();

  const isSalesAgent = useMemo(
    () => roleNames.some((n) => isSalesAgentRoleName(n)),
    [roleNames]
  );

  return useMemo(() => {
    if (isSalesAgent) return false;
    if (capabilities.referralSalesAgentAttribution === true) return true;
    if (process.env.NEXT_PUBLIC_FF_REFERRAL_SALES_AGENT_ATTRIBUTION === "true") {
      return true;
    }
    if (!permissionsLoaded) return false;
    return (
      hasPermission(permissions, "candidates.manageSalesAgentAttribution") ||
      hasPermission(permissions, "candidates.revokeSalesAgentAttribution")
    );
  }, [
    isSalesAgent,
    capabilities.referralSalesAgentAttribution,
    permissions,
    permissionsLoaded,
  ]);
}
export function useSalesAgentAttributionPermissions(featureEnabled: boolean) {
  const { permissions, permissionsLoaded, roleNames } = useAuth();
  const isSalesAgent = useMemo(
    () => roleNames.some((n) => isSalesAgentRoleName(n)),
    [roleNames]
  );

  const canManageAttribution = useMemo(() => {
    if (!featureEnabled || !permissionsLoaded) return false;
    if (isSalesAgent) return false;
    return (
      hasPermission(permissions, "candidates.manageSalesAgentAttribution") ||
      canManageCandidatesFromPermissions(permissions)
    );
  }, [featureEnabled, permissions, permissionsLoaded, isSalesAgent]);

  const canRevokeAttribution = useMemo(() => {
    if (!featureEnabled || !permissionsLoaded) return false;
    return hasPermission(permissions, "candidates.revokeSalesAgentAttribution");
  }, [featureEnabled, permissions, permissionsLoaded]);

  return { canManageAttribution, canRevokeAttribution, isSalesAgent };
}
