"use client";

import { Basicwizard } from "@/shared/data/pages/candidates/candidateform";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";

const AddCandidate = () => {
  return (
    <Fragment>
      <Seo title="Add Candidate" />
      <Pageheader
        currentpage="Add Candidate"
        activepage="Candidates"
        mainpage="Add Candidate"
      />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box overflow-hidden">
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

export default AddCandidate;
