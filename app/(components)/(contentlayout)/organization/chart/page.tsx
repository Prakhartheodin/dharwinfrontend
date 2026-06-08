"use client";

import { useEffect, useState } from "react";
import OrgChart from "../_components/OrgChart";
import { OrgLinkButton, OrgLoadingBlock, OrgPageLayout } from "../_components/org-ui";
import { getOrgTree, type OrgTree } from "@/shared/lib/api/org-structure";

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrgTree()
      .then(setTree)
      .catch(() => setTree({ roots: [], unassigned: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <OrgPageLayout
      seoTitle="Organization Chart"
      currentpage="Org Chart"
      subtitle="Interactive hierarchy from CEO through managers, supervisors, and departments. Expand nodes to explore reporting lines."
      headerActions={
        <OrgLinkButton href="/organization/structure" variant="secondary">
          <i className="ri-node-tree text-base" aria-hidden />
          Manage structure
        </OrgLinkButton>
      }
    >
      {loading ? <OrgLoadingBlock label="Building org chart…" /> : tree ? <OrgChart tree={tree} /> : null}
    </OrgPageLayout>
  );
}
