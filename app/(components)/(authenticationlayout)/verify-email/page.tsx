"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";

/**
 * Legacy path from older emails: `/verify-email/?token=...`
 * Redirects to the canonical `/authentication/verify-email/?token=...`
 */
export default function LegacyVerifyEmailRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const dest = token
      ? `${ROUTES.verifyEmail}?token=${encodeURIComponent(token)}`
      : ROUTES.verifyEmail;
    router.replace(dest);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
      Redirecting…
    </div>
  );
}
