"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.settingsRoles);
  }, [router]);

  return (
    <>
      <Seo title="Settings" />
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-defaulttextcolor/70">Redirecting to User Roles...</p>
      </div>
    </>
  );
}
