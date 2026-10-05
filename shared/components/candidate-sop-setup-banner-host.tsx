"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { candidateIdFromUrl } from "./candidate-sop-url";

const CandidateNextActionsStrip = dynamic(
  () =>
    import("@/app/(components)/(contentlayout)/ats/employees/_components/CandidateNextActionsStrip"),
  { ssr: false, loading: () => null },
);

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
