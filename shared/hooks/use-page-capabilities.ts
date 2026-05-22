"use client";

import { useEffect, useState } from "react";
import { getPageCapabilities, type PageCapabilitiesResponse } from "@/shared/lib/api/auth";
import { useAuth } from "@/shared/contexts/auth-context";

export interface UsePageCapabilitiesResult {
  capabilities: PageCapabilitiesResponse | null;
  isLoading: boolean;
  dashboardType: PageCapabilitiesResponse["dashboardType"] | null;
  hasWidget: (widget: string) => boolean;
}

/**
 * Fetches backend-issued page capabilities for the current user.
 * Re-fetches automatically when the user's permissionsVersion changes.
 * Use this instead of raw role/permission checks to decide which dashboard
 * variant to render and which widgets to display.
 */
export function usePageCapabilities(): UsePageCapabilitiesResult {
  const { user, permissionsLoaded } = useAuth();
  const [capabilities, setCapabilities] = useState<PageCapabilitiesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!permissionsLoaded || !user) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getPageCapabilities()
      .then((caps) => {
        if (!cancelled) setCapabilities(caps);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, permissionsLoaded]);

  return {
    capabilities,
    isLoading,
    dashboardType: capabilities?.dashboardType ?? null,
    hasWidget: (widget: string) => capabilities?.widgets.includes(widget) ?? false,
  };
}
