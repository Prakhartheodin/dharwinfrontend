"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCandidate, getMyCandidate } from "@/shared/lib/api/candidates";
import { useAuth } from "@/shared/contexts/auth-context";
import { useIsCandidateForProfile } from "@/shared/hooks/use-is-candidate-for-profile";
import AssignAgentSopModal from "../_components/AssignAgentSopModal";
import AssignTrainingCourseSopModal from "../_components/AssignTrainingCourseSopModal";
import { canAssignCandidateAgent, canAssignTrainingCourseFromSop } from "@/shared/lib/candidate-permissions";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";

const EditCandidate = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = searchParams.get("id");
  const { user, permissions, permissionsLoaded, isPlatformSuperUser } = useAuth();
  const { isCandidate, isLoading: rolesLoading } = useIsCandidateForProfile();
  const [initialData, setInitialData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const canAssignAgent = useMemo(
    () => canAssignCandidateAgent(permissions, isPlatformSuperUser),
    [permissions, isPlatformSuperUser]
  );
  const canAssignCourse = useMemo(
    () => canAssignTrainingCourseFromSop(permissions, isPlatformSuperUser),
    [permissions, isPlatformSuperUser]
  );

  const stripAssignAgentParam = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("assignAgent");
    const q = p.toString();
    const base = pathname || "";
    router.replace(q ? `${base}?${q}` : base);
  }, [pathname, router, searchParams]);

  const stripAssignCourseParam = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("assignCourse");
    const q = p.toString();
    const base = pathname || "";
    router.replace(q ? `${base}?${q}` : base);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!id || !user || rolesLoading) {
      if (!id || !rolesLoading) setLoading(false);
      return;
    }
    const load = async () => {
      try {
        if (isCandidate) {
          const data = await getMyCandidate();
          const dataId = (data as any).id ?? (data as any)._id;
          if (dataId === id) setInitialData(data);
          else setInitialData(null);
        } else {
          const data = await getCandidate(id);
          setInitialData(data);
        }
      } catch {
        setInitialData(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, user, isCandidate, rolesLoading]);

  useEffect(() => {
    if (!permissionsLoaded || searchParams.get("assignAgent") !== "1") return;
    if (isCandidate || !canAssignAgent) {
      stripAssignAgentParam();
    }
  }, [permissionsLoaded, searchParams, isCandidate, canAssignAgent, stripAssignAgentParam]);

  useEffect(() => {
    if (!permissionsLoaded || searchParams.get("assignCourse") !== "1") return;
    if (isCandidate || !canAssignCourse) {
      stripAssignCourseParam();
    }
  }, [permissionsLoaded, searchParams, isCandidate, canAssignCourse, stripAssignCourseParam]);

  const showAssignAgentModal =
    permissionsLoaded &&
    searchParams.get("assignAgent") === "1" &&
    Boolean(id) &&
    !isCandidate &&
    canAssignAgent &&
    Boolean(initialData);

  const showAssignCourseModal =
    permissionsLoaded &&
    searchParams.get("assignCourse") === "1" &&
    Boolean(id) &&
    !isCandidate &&
    canAssignCourse &&
    Boolean(initialData);

  const handleAgentAssigned = useCallback(async () => {
    if (!id || isCandidate) return;
    try {
      const data = await getCandidate(id);
      setInitialData(data);
      dispatchSopStripRefresh();
    } catch {
      /* keep existing form data */
    }
  }, [id, isCandidate]);

  const handleCourseAssigned = useCallback(async () => {
    dispatchSopStripRefresh();
  }, []);

  const currentAgent = initialData?.assignedAgent ?? null;

  return (
    <Fragment>
      <Seo title="Edit Candidate" />
      <Pageheader
        currentpage="Edit Candidate"
        activepage="Candidates"
        mainpage="Edit Candidate"
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="box-body !p-0 product-checkout">
              {loading ? (
                <div className="p-6 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : initialData ? (
                <>
                  <Basicwizard initialData={initialData} />
                </>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  {id ? "Candidate not found." : "No candidate selected."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {id && showAssignAgentModal ? (
        <AssignAgentSopModal
          open
          candidateId={id}
          candidateName={initialData?.fullName}
          currentAgent={currentAgent}
          onClose={stripAssignAgentParam}
          onAssigned={handleAgentAssigned}
        />
      ) : null}
      {id && showAssignCourseModal ? (
        <AssignTrainingCourseSopModal
          open
          candidateId={id}
          candidateName={initialData?.fullName}
          onClose={stripAssignCourseParam}
          onAssigned={handleCourseAssigned}
        />
      ) : null}
    </Fragment>
  );
};

export default EditCandidate;
