"use client";

import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { isPublicLayoutPath } from "@/shared/lib/public-layout-paths";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = ROUTES.signIn }: ProtectedRouteProps) {
  const { user, isChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = isPublicLayoutPath(pathname ?? "");

  useEffect(() => {
    if (!isChecked) return;
    if (user == null && !isPublicLayoutPath(pathname ?? "")) {
      router.replace(redirectTo);
    }
  }, [isChecked, user, router, redirectTo, pathname]);

  if (!isChecked) {
    // Branded auth-check loader. Matches the login page UX (Poppins, brand green,
    // Dharwin logo, #FBFBFB) so the login → app handoff feels continuous.
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
        style={{ fontFamily: "'Poppins', sans-serif", background: "#FBFBFB" }}
      >
        {/* Same brand asset the auth pages use */}
        <img
          src="/assets/images/logo.png"
          alt="Dharwin Business Solutions"
          className="select-none"
          style={{ width: 200, height: "auto", objectFit: "contain" }}
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.onerror = null;
            t.src = "/assets/images/brand-logos/dharwin-white-logo.png";
          }}
        />
        {/* Spinner mirrors the login button's spinner; brand green #34B34C */}
        <svg
          className="animate-spin motion-reduce:animate-none"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "#34B34C" }}
          aria-hidden="true"
        >
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 400, color: "#98A2B3", letterSpacing: 0.2 }}>
          Loading…
        </span>
      </div>
    );
  }

  if (user == null && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
