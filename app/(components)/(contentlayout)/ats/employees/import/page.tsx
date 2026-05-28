"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import React, { Fragment, useMemo } from "react";

/**
 * Dedicated Excel Import page.
 * Navigate here from Candidates list → Excel → Import.
 * Back button returns to /ats/employees (not to Add Candidate manual form).
 */
const ImportCandidates = () => {
  const { permissions, permissionsLoaded, isPlatformSuperUser } = useAuth();
  const canCreate = useMemo(
    () => hasPermission({ permissions: permissions ?? [], isPlatformSuperUser }, "create_employee"),
    [permissions, isPlatformSuperUser]
  );

  return (
    <Fragment>
      <Seo title="Excel Import Candidates" />
      <Pageheader
        currentpage="Excel Import Candidates"
        activepage="Candidates"
        mainpage="Excel Import"
      />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box overflow-hidden">
              <div className="box-body !p-0 product-checkout">
                {!permissionsLoaded ? (
                  <div className="p-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : canCreate ? (
                  <Basicwizard initialExcelMode returnToCandidatesOnBack />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    You do not have permission to import employees.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ImportCandidates;
