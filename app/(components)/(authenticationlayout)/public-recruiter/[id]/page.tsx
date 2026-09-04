"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import Seo from "@/shared/layout-components/seo/seo";
import RecruiterPublicProfileView from "@/shared/components/ats/RecruiterPublicProfileView";
import {
  getPublicRecruiterProfile,
  type PublicRecruiterProfile,
} from "@/shared/lib/api/publicRecruiter";

export default function PublicRecruiterProfilePage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const [profile, setProfile] = useState<PublicRecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("This profile link is invalid.");
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
            : "This recruiter profile is no longer available.";
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

  return (
    <>
      <Seo title={profile?.name ? `${profile.name} — Recruiter` : "Recruiter Profile"} />
      <RecruiterPublicProfileView profile={profile} loading={loading} error={error} />
    </>
  );
}
