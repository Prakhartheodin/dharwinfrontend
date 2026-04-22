"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";

/**
 * Dedicated Excel Import page.
 * Navigate here from Candidates list → Excel → Import.
 * Back button returns to /ats/employees (not to Add Candidate manual form).
 */
const ImportCandidates = () => {
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
                <Basicwizard initialExcelMode returnToCandidatesOnBack />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ImportCandidates;
