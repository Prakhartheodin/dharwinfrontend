"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCandidate } from "@/shared/lib/api/candidates";
import { useAuth } from "@/shared/contexts/auth-context";
import { useIsEmployeeForProfile } from "@/shared/hooks/use-is-employee-for-profile";
import AssignAgentSopModal from "../_components/AssignAgentSopModal";
import AssignTrainingCourseSopModal from "../_components/AssignTrainingCourseSopModal";
import { canAssignCandidateAgent, canAssignTrainingCourseFromSop } from "@/shared/lib/candidate-permissions";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";
import { hasPermission } from "@/shared/lib/permissions";
import {
  EmployeeFormAlert,
  EmployeeFormPageShell,
  FormLoadingSpinner,
  LazyEmployeeForm,
} from "../_components/employee-form-page-ui";
type LoadError = "network" | "not_found";

function employeesListReturnUrl(returnPageRaw: string | null): string {
  const returnPage = returnPageRaw ? Number.parseInt(returnPageRaw, 10) : NaN;
  return Number.isInteger(returnPage) && returnPage >= 1
    ? `/ats/employees?page=${returnPage}`
    : "/ats/employees";
}

const EditEmployee = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = searchParams.get("id");
  const listReturnUrl = employeesListReturnUrl(searchParams.get("returnPage"));
  const { user, permissions, permissionsLoaded, isPlatformSuperUser } = useAuth();
  const { isEmployee, isLoading: rolesLoading } = useIsEmployeeForProfile();
  const [initialData, setInitialData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const canAssignAgent = useMemo(
    () => canAssignCandidateAgent(permissions, isPlatformSuperUser),
    [permissions, isPlatformSuperUser]
  );
  const canAssignCourse = useMemo(
    () => canAssignTrainingCourseFromSop(permissions, isPlatformSuperUser),
    [permissions, isPlatformSuperUser]
  );
  const canUpdateEmployee = useMemo(
    () => hasPermission({ permissions: permissions ?? [], isPlatformSuperUser }, "update_employee"),
    [permissions, isPlatformSuperUser]
  );
  const canEditThisProfile = isEmployee || canUpdateEmployee;

  const stripSearchParam = useCallback(
    (key: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete(key);
      const q = p.toString();
      const base = pathname || "";
      router.replace(q ? `${base}?${q}` : base);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (!permissionsLoaded || rolesLoading || !user) return;
    if (!isEmployee) return;
    router.replace("/settings/personal-information");
  }, [permissionsLoaded, rolesLoading, user, isEmployee, router]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setInitialData(null);
      setLoadError(null);
      return;
    }
    if (!user || rolesLoading) return;
    if (isEmployee) {
      setLoading(false);
      setInitialData(null);
      setLoadError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getCandidate(id);
        setInitialData(data);
      } catch (err: unknown) {
        setInitialData(null);
        const status = (err as { response?: { status?: number } })?.response?.status;
        setLoadError(status === 404 ? "not_found" : "network");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, user, isEmployee, rolesLoading]);

  useEffect(() => {
    if (!permissionsLoaded || searchParams.get("assignAgent") !== "1") return;
    if (isEmployee || !canAssignAgent) {
      stripSearchParam("assignAgent");
    }
  }, [permissionsLoaded, searchParams, isEmployee, canAssignAgent, stripSearchParam]);

  useEffect(() => {
    if (!permissionsLoaded || searchParams.get("assignCourse") !== "1") return;
    if (isEmployee || !canAssignCourse) {
      stripSearchParam("assignCourse");
    }
  }, [permissionsLoaded, searchParams, isEmployee, canAssignCourse, stripSearchParam]);

  const showAssignAgentModal =
    permissionsLoaded &&
    searchParams.get("assignAgent") === "1" &&
    Boolean(id) &&
    !isEmployee &&
    canAssignAgent &&
    Boolean(initialData);

  const showAssignCourseModal =
    permissionsLoaded &&
    searchParams.get("assignCourse") === "1" &&
    Boolean(id) &&
    !isEmployee &&
    canAssignCourse &&
    Boolean(initialData);

  const handleAgentAssigned = useCallback(async () => {
    if (!id || isEmployee) return;
    try {
      const data = await getCandidate(id);
      setInitialData(data);
      dispatchSopStripRefresh();
    } catch {
      /* keep existing form data */
    }
  }, [id, isEmployee]);

  const handleCourseAssigned = useCallback(() => {
    dispatchSopStripRefresh();
  }, []);

  const editAlert = (title: string, description: string) => (
    <EmployeeFormAlert title={title} description={description} returnUrl={listReturnUrl} />
  );

  const renderBody = () => {
    if (loading) {
      return <FormLoadingSpinner label="Loading employee profile" />;
    }
    if (!permissionsLoaded || rolesLoading) {
      return <FormLoadingSpinner label="Checking permissions" />;
    }
    if (isEmployee) {
      return <FormLoadingSpinner label="Redirecting to personal information" />;
    }
    if (!canEditThisProfile) {
      return editAlert(
        "Access denied",
        "You do not have permission to edit employees. Contact an administrator if you believe this is a mistake."
      );
    }
    if (!id) {
      return editAlert(
        "No employee selected",
        "Open an employee from the employees list to edit their profile."
      );
    }
    if (loadError === "network") {
      return editAlert(
        "Could not load employee",
        "We couldn't reach the server. Check your connection and try again from the employees list."
      );
    }
    if (loadError === "not_found" || !initialData) {
      return editAlert(
        "Employee not found",
        "This employee may have been removed or you may not have access to view them."
      );
    }
    return (
      <>
        <LazyEmployeeForm
          initialData={initialData}
          relaxPersonalInfoValidation={!isEmployee}
          selfServiceEdit={isEmployee}
          employeesListReturnUrl={listReturnUrl}
        />
      </>
    );
  };

  return (
    <>
      <EmployeeFormPageShell seoTitle="Edit Employee">
        {renderBody()}
      </EmployeeFormPageShell>

      {id && showAssignAgentModal ? (
        <AssignAgentSopModal
          open
          candidateId={id}
          candidateName={initialData?.fullName}
          currentAgent={initialData?.assignedAgent ?? null}
          onClose={() => stripSearchParam("assignAgent")}
          onAssigned={handleAgentAssigned}
        />
      ) : null}
      {id && showAssignCourseModal ? (
        <AssignTrainingCourseSopModal
          open
          candidateId={id}
          candidateName={initialData?.fullName}
          onClose={() => stripSearchParam("assignCourse")}
          onAssigned={handleCourseAssigned}
        />
      ) : null}
    </>
  );
};

export default EditEmployee;
