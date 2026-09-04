"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import Seo from "@/shared/layout-components/seo/seo";
import RecruiterPublicProfileView from "@/shared/components/ats/RecruiterPublicProfileView";
import {
  getPublicRecruiterProfile,
  type PublicRecruiterProfile,
} from "@/shared/lib/api/publicRecruiter";

export default function PublicRecruiterProfilePreviewPage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const [profile, setProfile] = useState<PublicRecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("This preview link is invalid.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicRecruiterProfile(id)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          isAxiosError(err) && err.response?.data?.message
            ? String(err.response.data.message)
            : "Could not load recruiter for preview.";
        setError(msg);
        setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const previewBanner = (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <strong className="font-semibold">Preview</strong>
      <span className="mx-1.5 hidden sm:inline">—</span>
      <span className="block sm:inline">
        This is how the shared recruiter profile appears to external viewers.
      </span>{" "}
      <Link href="/ats/recruiters" className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-white">
        Back to Recruiters
      </Link>
      {id ? (
        <>
          {" "}
          <span className="hidden sm:inline">·</span>{" "}
          <Link
            href={`/public-recruiter/${id}`}
            className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-white"
          >
            Open live link
          </Link>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <Seo title={profile?.name ? `Preview — ${profile.name}` : "Recruiter Profile Preview"} />
      <RecruiterPublicProfileView
        profile={profile}
        loading={loading}
        error={error}
        previewBanner={previewBanner}
      />
    </>
  );
}
