"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/shared/lib/constants";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

function getActiveTab(pathname: string): "roles" | "users" | "attendance" | "personal-information" | null {
  if (pathname.startsWith("/settings/roles")) return "roles";
  if (pathname.startsWith("/settings/users")) return "users";
  if (pathname.startsWith("/settings/attendance")) return "attendance";
  if (pathname.startsWith("/settings/personal-information")) return "personal-information";
  return null;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const activeTab = getActiveTab(pathname ?? "");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [hasUsersAccess, setHasUsersAccess] = useState<boolean | null>(null);
  const [hasAttendanceAccess, setHasAttendanceAccess] = useState<boolean | null>(null);

  // Determine admin (Roles only), users access (Admin or Agent), and attendance access
  useEffect(() => {
    const check = async () => {
      try {
        if (!user || !user.roleIds || (user.roleIds as string[]).length === 0) {
          setIsAdmin(false);
          setHasUsersAccess(false);
          setHasAttendanceAccess(false);
          return;
        }
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = res.results as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => roleMap.set(r.id, r));
        let admin = false;
        const roleNames = new Set<string>();
        const perms = new Set<string>();
        (user.roleIds as string[]).forEach((id) => {
          const role = roleMap.get(id);
          if (!role) return;
          role.permissions?.forEach((p) => perms.add(p));
          if (role.name) roleNames.add(role.name);
          if (role.name === "Administrator") admin = true;
        });
        setIsAdmin(admin);
        // Agents and Administrators can access Users; only Administrators can access User Roles
        setHasUsersAccess(admin || roleNames.has("Agent"));
        const hasAgentOrAdminRole = roleNames.has("Administrator") || roleNames.has("Agent");
        const hasStudentsManage = Array.from(perms).some((p) => p === "students.manage" || p.startsWith("students.manage"));
        const hasAttendanceManage = Array.from(perms).some(
          (p) =>
            p === "attendance.manage" ||
            p === "training.attendance:view,create,edit" ||
            (p.includes("training.attendance") && (p.includes("create") || p.includes("edit") || p.includes("view")))
        );
        const hasRelevantPermissions = admin || hasStudentsManage || hasAttendanceManage;
        setHasAttendanceAccess(hasAgentOrAdminRole && hasRelevantPermissions);
      } catch {
        setIsAdmin(false);
        setHasUsersAccess(false);
        setHasAttendanceAccess(false);
      }
    };
    check();
  }, [user]);

  // Redirect: roles = admin only; users = admin or agent; attendance = hasAttendanceAccess
  useEffect(() => {
    if (isAdmin === null || hasUsersAccess === null || hasAttendanceAccess === null) return;
    if (activeTab === "roles") {
      if (!isAdmin) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "users") {
      if (!hasUsersAccess) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "attendance") {
      if (!hasAttendanceAccess) router.replace(ROUTES.settingsPersonalInfo);
    }
  }, [isAdmin, hasUsersAccess, hasAttendanceAccess, activeTab, router]);

  const tabClass = (tab: "roles" | "users" | "attendance" | "personal-information") =>
    `m-1 block w-full py-2 px-3 flex-grow text-[0.75rem] font-medium rounded-md hover:text-primary ${
      activeTab === tab
        ? "bg-primary/10 text-primary"
        : "text-defaulttextcolor dark:text-defaulttextcolor/70"
    }`;

  return (
    <div className="container w-full max-w-full mx-auto">
      <div className="grid grid-cols-12 gap-6 mb-[3rem]">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header sm:flex block !justify-start">
              <nav
                aria-label="Settings tabs"
                className="md:flex block !justify-start whitespace-nowrap"
                role="tablist"
              >
                {isAdmin && (
                  <Link
                    href={ROUTES.settingsRoles}
                    className={tabClass("roles")}
                    aria-current={activeTab === "roles" ? "page" : undefined}
                  >
                    User Roles
                  </Link>
                )}
                {hasUsersAccess && (
                  <Link
                    href={ROUTES.settingsUsers}
                    className={tabClass("users")}
                    aria-current={activeTab === "users" ? "page" : undefined}
                  >
                    Users
                  </Link>
                )}
                {hasAttendanceAccess && (
                  <Link
                    href={ROUTES.settingsAttendance}
                    className={tabClass("attendance")}
                    aria-current={activeTab === "attendance" ? "page" : undefined}
                  >
                    Attendance
                  </Link>
                )}
                <Link
                  href={ROUTES.settingsPersonalInfo}
                  className={tabClass("personal-information")}
                  aria-current={activeTab === "personal-information" ? "page" : undefined}
                >
                  Personal Information
                </Link>
              </nav>
            </div>
            <div>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
