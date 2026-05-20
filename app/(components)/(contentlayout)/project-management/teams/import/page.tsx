"use client";

import TeamImportContent from "../components/TeamImportContent";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";

/**
 * Dedicated Excel import page for teams roster.
 * Navigate from Teams → Excel → Import.
 */
export default function TeamsExcelImportPage() {
  return (
    <Fragment>
      <Seo title="Excel Import Teams" />
      <Pageheader
        currentpage="Excel Import Teams"
        activepage="Teams"
        mainpage="Excel Import"
      />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box overflow-hidden">
              <div className="box-body !p-0">
                <TeamImportContent returnToTeamsOnBack />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
