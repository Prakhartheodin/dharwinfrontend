"use client";

import { RecruiterWizard } from "@/shared/data/pages/recruiters/recruiterform";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";

const AddRecruiter = () => {
  return (
    <Fragment>
      <Seo title="Add Recruiter" />
      <Pageheader
        currentpage="Add Recruiter"
        activepage="Recruiters"
        mainpage="Add Recruiter"
      />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box overflow-hidden">
              <div className="box-body !p-0 product-checkout">
                <RecruiterWizard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddRecruiter;
