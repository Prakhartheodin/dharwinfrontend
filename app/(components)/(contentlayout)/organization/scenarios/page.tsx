"use client";

import dynamic from "next/dynamic";
import { OrgNavButton, OrgLoadingBlock, OrgPageLayout } from "../_components/org-ui";

// Lazy-load the panel so the route shell compiles fast (defers Swal + scenario graph).
const OrgScenariosPanel = dynamic(() => import("../_components/OrgScenariosPanel"), {
  ssr: false,
  loading: () => <OrgLoadingBlock label="Loading scenarios…" />,
});

export default function OrganizationScenariosPage() {
  return (
    <OrgPageLayout
      seoTitle="Org Scenarios"
      currentpage="Scenarios"
      subtitle="Draft reorgs in a sandbox, preview diffs, drag units in the scenario table, then apply with batch audit."
      headerActions={
        <>
          <OrgNavButton href="/organization/chart" variant="secondary">
            <i className="ri-organization-chart text-base" aria-hidden />
            Live chart
          </OrgNavButton>
          <OrgNavButton href="/organization/structure" variant="secondary">
            <i className="ri-node-tree text-base" aria-hidden />
            Structure
          </OrgNavButton>
        </>
      }
    >
      <OrgScenariosPanel />
    </OrgPageLayout>
  );
}
