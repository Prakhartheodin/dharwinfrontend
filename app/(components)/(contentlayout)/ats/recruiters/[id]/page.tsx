"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy share URLs under /ats/recruiters/:id redirect to the public profile route. */
export default function RecruiterProfileRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  useEffect(() => {
    if (!id) {
      router.replace("/ats/recruiters");
      return;
    }
    router.replace(`/public-recruiter/${id}`);
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Opening recruiter profile…</p>
      </div>
    </div>
  );
}
