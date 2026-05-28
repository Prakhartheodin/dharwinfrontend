"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import React, { Fragment, useMemo } from "react";

const AddEmployee = () => {
  const { permissions, permissionsLoaded, isPlatformSuperUser } = useAuth();
  const canCreate = useMemo(
    () => hasPermission({ permissions: permissions ?? [], isPlatformSuperUser }, "create_employee"),
    [permissions, isPlatformSuperUser]
  );

  return (
    <Fragment>
      <Seo title="Add Employee" />
      <div className="container-fluid max-w-[100vw] px-3 pt-4 pb-6 sm:px-4 sm:pt-6 md:pb-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box custom-box overflow-hidden">
              <div className="box-body !p-0 product-checkout">
                {!permissionsLoaded ? (
                  <div className="p-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : canCreate ? (
                  <Basicwizard />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    You do not have permission to add employees.
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

export default AddEmployee;
