"use client";

import StructurePanel from "../_components/StructurePanel";
import { OrgNavButton, OrgPageLayout } from "../_components/org-ui";

export default function StructurePage() {
  return (
    <OrgPageLayout
      seoTitle="Organization Structure"
      currentpage="Structure"
      subtitle="Define CEO, manager, supervisor, and department nodes, then assign heads and reparent units as the company evolves."
      headerActions={
        <>
          <OrgNavButton href="/organization/chart" variant="secondary">
            <i className="ri-organization-chart text-base" aria-hidden />
            View chart
          </OrgNavButton>
          <OrgNavButton href="/organization/departments" variant="secondary">
            <i className="ri-building-2-line text-base" aria-hidden />
            Departments
          </OrgNavButton>
        </>
      }
    >
      <StructurePanel />
    </OrgPageLayout>
  );
}
