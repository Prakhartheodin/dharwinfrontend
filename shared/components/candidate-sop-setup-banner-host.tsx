"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import CandidateNextActionsStrip from "@/app/(components)/(contentlayout)/ats/employees/_components/CandidateNextActionsStrip";

/** Resolve candidate id from common SOP deep-link query shapes. */
export function candidateIdFromUrl(pathname: string | null, searchString: string): string | null {
  const sp = new URLSearchParams(searchString);
  const cid = sp.get("candidateId")?.trim();
  if (cid) return cid;
  if (pathname?.includes("/ats/employees/edit")) {
    const id = sp.get("id")?.trim();
    if (id) return id;
  }
  return null;
}

/**
 * Renders the onboarding strip whenever the URL names a candidate (edit page or attendance assign flows).
 */
export default function CandidateSopSetupBannerHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const candidateId = useMemo(
    () => candidateIdFromUrl(pathname ?? null, searchParams.toString()),
    [pathname, searchParams],
  );

  if (!candidateId) return null;

  return (
    <div className="mb-0 [&+*]:mt-0">
      <CandidateNextActionsStrip candidateId={candidateId} />
    </div>
  );
}
