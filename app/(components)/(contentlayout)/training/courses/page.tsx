"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";

/**
 * Legacy SOP links pointed here (/training/courses). Redirect to candidate edit with the course picker.
 */
export default function TrainingCoursesLegacyRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cid = searchParams.get("candidateId")?.trim();
    const q = new URLSearchParams();
    if (cid) q.set("id", cid);
    q.set("assignCourse", "1");
    searchParams.forEach((value, key) => {
      if (key === "candidateId") return;
      if (key === "id") return;
      q.set(key, value);
    });
    if (cid) {
      router.replace(`/ats/employees/edit?${q.toString()}`);
    } else {
      router.replace("/training/curriculum/modules");
    }
  }, [router, searchParams]);

  return (
    <>
      <Seo title="Redirecting…" />
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-defaulttextcolor/70">
        <span className="inline-flex items-center gap-2">
          <i className="ri-loader-4-line animate-spin text-lg text-primary" aria-hidden />
          Opening assign training…
        </span>
      </div>
    </>
  );
}
