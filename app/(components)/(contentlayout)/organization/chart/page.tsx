"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OrgErrorState, OrgLinkButton, OrgLoadingBlock, OrgPageLayout } from "../_components/org-ui";

// Lazy-load the chart (and its heavy echarts dependency) so this route compiles
// fast and echarts is built as a separate on-demand chunk.
const OrgChart = dynamic(() => import("../_components/OrgChart"), {
  ssr: false,
  loading: () => <OrgLoadingBlock label="Loading chart…" />,
});
import { getOrgCoverage, getOrgTree, type OrgCoverageSummary, type OrgTree } from "@/shared/lib/api/org-structure";

function MetricCard({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warning" | "success" }) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning/[0.04]"
      : tone === "success"
        ? "border-success/30 bg-success/[0.04]"
        : "border-defaultborder/60 bg-white dark:bg-bodybg";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="mb-1 text-[0.75rem] text-defaulttextcolor/60">{label}</p>
      <p className="mb-0 text-xl font-semibold text-defaulttextcolor">{value}</p>
    </div>
  );
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [coverage, setCoverage] = useState<OrgCoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [t, c] = await Promise.all([getOrgTree(), getOrgCoverage()]);
      setTree(t);
      setCoverage(c);
    } catch {
      setError(true);
      setTree(null);
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OrgPageLayout
      seoTitle="Organization Chart"
      currentpage="Org Chart"
      subtitle="Interactive hierarchy from CEO through managers, supervisors, and departments. Expand nodes to explore reporting lines."
      headerActions={
        <>
          <OrgLinkButton href="/organization/directory" variant="secondary">
            <i className="ri-contacts-book-2-line text-base" aria-hidden />
            Directory
          </OrgLinkButton>
          <OrgLinkButton href="/organization/scenarios" variant="secondary">
            <i className="ri-git-branch-line text-base" aria-hidden />
            Scenarios
          </OrgLinkButton>
          <OrgLinkButton href="/organization/structure" variant="secondary">
            <i className="ri-node-tree text-base" aria-hidden />
            Manage structure
          </OrgLinkButton>
        </>
      }
    >
      {loading ? (
        <OrgLoadingBlock label="Building org chart…" />
      ) : error ? (
        <OrgErrorState onRetry={() => void load()} />
      ) : (
        <>
          {coverage ? (
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Active employees" value={coverage.totalActiveEmployees} />
              <MetricCard label="Assigned" value={coverage.assignedEmployees} tone="success" />
              <MetricCard label="Unassigned" value={coverage.unassignedEmployees} tone={coverage.unassignedEmployees ? "warning" : "success"} />
              <MetricCard label="Units missing head" value={coverage.unitsMissingHead} tone={coverage.unitsMissingHead ? "warning" : "default"} />
              <MetricCard label="Over-span units" value={coverage.overSpanUnits ?? 0} tone={(coverage.overSpanUnits ?? 0) ? "warning" : "default"} />
            </div>
          ) : null}
          {tree ? <OrgChart tree={tree} onChanged={load} /> : null}
        </>
      )}
    </OrgPageLayout>
  );
}
