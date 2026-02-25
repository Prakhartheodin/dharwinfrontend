"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyCandidate } from "@/shared/lib/api/candidates";
import { useAuth } from "@/shared/contexts/auth-context";
import { useIsCandidateForProfile } from "@/shared/hooks/use-is-candidate-for-profile";
import { ROUTES } from "@/shared/lib/constants";
import Profile from "@/app/(components)/(contentlayout)/pages/profile/page";

/**
 * My Profile page. For candidates (share-candidate-form, no Administrator): fetches candidate record and redirects to edit.
 * For admins/others: shows generic profile (no /candidates/me API call).
 */
export default function MyProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isCandidate, isLoading: rolesLoading } = useIsCandidateForProfile();

  useEffect(() => {
    if (!user || !isCandidate || rolesLoading) return;

    getMyCandidate()
      .then((c) => {
        const id = (c as any).id ?? (c as any)._id;
        if (id) router.replace(`/ats/candidates/edit/?id=${id}`);
      })
      .catch(() => {});
  }, [user, isCandidate, rolesLoading, router]);

  // Non-candidates (admins, etc.): show generic profile — never call getMyCandidate
  if (user && !isCandidate && !rolesLoading) {
    return <Profile />;
  }

  // Candidates: loading until redirect to edit
  return (
    <>
      <Seo title="My Profile" />
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-defaulttextcolor dark:text-white/70">Loading your profile...</p>
          <p className="text-sm text-defaulttextcolor/60 mt-2">
            <Link href={ROUTES.defaultAfterLogin} className="text-primary hover:underline">
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
