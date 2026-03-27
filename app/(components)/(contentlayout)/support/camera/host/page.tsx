"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import SupportCameraSessionClient from "../_components/SupportCameraSessionClient";
import Link from "next/link";
import { ROUTES } from "@/shared/lib/constants";

function HostInner() {
  const searchParams = useSearchParams();
  const t = searchParams.get("t")?.trim() ?? "";
  const { permissionsLoaded, isDesignatedSuperadmin } = useAuth();

  if (!permissionsLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="ti-btn ti-btn-primary ti-btn-loading">Loading…</div>
      </div>
    );
  }

  if (!isDesignatedSuperadmin) {
    return (
      <div className="box-body p-6 max-w-lg mx-auto">
        <p className="text-warning text-sm mb-4">Only the designated platform account can open the viewer session.</p>
        <Link href={ROUTES.settingsUsers} className="ti-btn ti-btn-primary">
          Back to users
        </Link>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="box-body p-6 max-w-lg mx-auto">
        <p className="text-defaulttextcolor/80 text-sm mb-4">
          Missing session token. Start from Settings → Users → Request live camera session.
        </p>
        <Link href={ROUTES.settingsUsers} className="ti-btn ti-btn-primary">
          User list
        </Link>
      </div>
    );
  }

  return <SupportCameraSessionClient inviteToken={t} mode="host" />;
}

export default function SupportCameraHostPage() {
  return (
    <>
      <Seo title="Support camera (viewer)" />
      <div className="px-4 py-4">
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="ti-btn ti-btn-primary ti-btn-loading">Loading…</div>
            </div>
          }
        >
          <HostInner />
        </Suspense>
      </div>
    </>
  );
}
