"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import OrgChart from "../_components/OrgChart";
import { OrgErrorState, OrgLinkButton, OrgLoadingBlock, OrgPageLayout, OrgPrimaryButton } from "../_components/org-ui";
import {
  exportOrgComplianceReport,
  getOrgCoverage,
  getOrgTree,
  type OrgCoverageSummary,
  type OrgTree,
} from "@/shared/lib/api/org-structure";

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
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const report = await exportOrgComplianceReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `org-compliance-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Could not generate the compliance report. Please try again.";
      await Swal.fire({ icon: "error", title: "Export failed", text: msg });
    } finally {
      setExporting(false);
    }
  };

  return (
    <OrgPageLayout
      seoTitle="Organization Chart"
      currentpage="Org Chart"
      subtitle="Interactive hierarchy from CEO through managers, supervisors, and departments. Expand nodes to explore reporting lines."
      headerActions={
        <>
          <OrgPrimaryButton type="button" onClick={() => void handleExport()} disabled={exporting || loading}>
            <i className="ri-download-2-line text-base" aria-hidden />
            {exporting ? "Exporting…" : "Export compliance report"}
          </OrgPrimaryButton>
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
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Active employees" value={coverage.totalActiveEmployees} />
              <MetricCard label="Assigned" value={coverage.assignedEmployees} tone="success" />
              <MetricCard label="Unassigned" value={coverage.unassignedEmployees} tone={coverage.unassignedEmployees ? "warning" : "success"} />
              <MetricCard label="Units missing head" value={coverage.unitsMissingHead} tone={coverage.unitsMissingHead ? "warning" : "default"} />
            </div>
          ) : null}
          {tree ? <OrgChart tree={tree} onChanged={load} /> : null}
        </>
      )}
    </OrgPageLayout>
  );
}
