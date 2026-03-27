"use client";

import React from "react";
import { useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import SupportCameraSessionClient from "../../_components/SupportCameraSessionClient";
import Link from "next/link";
import { ROUTES } from "@/shared/lib/constants";

export default function SupportCameraJoinPage() {
  const routeParams = useParams();
  const raw = routeParams?.token;
  const token = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "")?.trim() ?? "";
  const { permissionsLoaded } = useAuth();

  return (
    <>
      <Seo title="Support camera — share video" />
      <div className="px-4 py-4">
        {!permissionsLoaded ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="ti-btn ti-btn-primary ti-btn-loading">Loading…</div>
          </div>
        ) : !token ? (
          <div className="box-body p-6 max-w-lg mx-auto">
            <p className="text-defaulttextcolor/80 text-sm mb-4">Invalid invitation link.</p>
            <Link href={ROUTES.defaultAfterLogin} className="ti-btn ti-btn-primary">
              Dashboard
            </Link>
          </div>
        ) : (
          <SupportCameraSessionClient inviteToken={token} mode="guest" />
        )}
      </div>
    </>
  );
}
