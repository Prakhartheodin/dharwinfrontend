"use client";

import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Root entry: wait for session check, then send users to dashboard or sign-in.
 * Avoids rendering the legacy template login that previously flashed before redirects.
 */
export default function HomePage() {
  const { user, isChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isChecked) return;
    router.replace(user ? ROUTES.defaultAfterLogin : ROUTES.signIn);
  }, [isChecked, user, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="ti-btn ti-btn-primary ti-btn-lg ti-btn-loading">Loading...</div>
    </div>
  );
}
