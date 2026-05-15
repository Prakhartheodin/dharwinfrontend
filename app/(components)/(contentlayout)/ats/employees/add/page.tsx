"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";

const AddEmployee = () => {
  return (
    <Fragment>
      <Seo title="Add Employee" />
      <div className="container-fluid max-w-[100vw] px-3 pt-4 pb-6 sm:px-4 sm:pt-6 md:pb-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box custom-box overflow-hidden">
              <div className="box-body !p-0 product-checkout">
                <Basicwizard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddEmployee;
