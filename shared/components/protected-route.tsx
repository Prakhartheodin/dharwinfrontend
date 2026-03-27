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
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="ti-btn ti-btn-primary ti-btn-lg ti-btn-loading">Loading...</div>
      </div>
    );
  }

  if (user == null && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
