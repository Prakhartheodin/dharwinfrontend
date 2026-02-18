"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import Seo from "@/shared/layout-components/seo/seo";

export default function SettingsAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.settingsAttendanceWeekOff);
  }, [router]);

  return (
    <>
      <Seo title="Attendance Settings" />
      <div className="py-8 text-center text-defaulttextcolor/70">Redirecting…</div>
    </>
  );
}
