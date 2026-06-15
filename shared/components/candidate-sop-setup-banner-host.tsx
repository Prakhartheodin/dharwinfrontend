"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import CandidateNextActionsStrip from "@/app/(components)/(contentlayout)/ats/employees/_components/CandidateNextActionsStrip";
import { candidateIdFromUrl } from "./candidate-sop-url";

export { candidateIdFromUrl } from "./candidate-sop-url";

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
