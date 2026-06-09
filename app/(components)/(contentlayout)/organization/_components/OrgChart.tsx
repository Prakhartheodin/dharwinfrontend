"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import type { OrgTree, OrgUnitNode } from "@/shared/lib/api/org-structure";
import { ORG_UNIT_TYPE_META, OrgChartLegend, OrgEmptyState, OrgLinkButton, OrgPrimaryButton } from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import AssignToDepartmentModal from "./AssignToDepartmentModal";

const truncate = (s: string, max = 28) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// Head + members live in the tooltip; the on-node label stays short so long
// names don't overflow the canvas.
const nodeLabel = (n: OrgUnitNode) => {
  const count = n.memberCount ? ` (${n.memberCount})` : "";
  return `${truncate(n.name)}${count}`;
};

// Deepest level in the tree, counting employees as one level below their department.
const treeDepth = (nodes: OrgUnitNode[], d = 1): number =>
  (nodes ?? []).reduce((m, n) => {
    const childD = n.children?.length ? treeDepth(n.children, d + 1) : d;
    const empD = n.employees?.length ? d + 1 : d;
    return Math.max(m, childD, empD);
  }, d);

const countLeaves = (nodes: OrgUnitNode[]): number =>
  (nodes ?? []).reduce((acc, n) => {
    const childLeaves = n.children?.length ? countLeaves(n.children) : 0;
    const empLeaves = n.employees?.length ?? 0;
    const ownLeaf = !n.children?.length && !n.employees?.length ? 1 : 0;
    return acc + childLeaves + empLeaves + ownLeaf;
  }, 0);

const nodeTooltip = (n: OrgUnitNode) => {
  const lines = [`${ORG_UNIT_TYPE_META[n.type]?.label ?? n.type}: ${n.name}`];
  if (n.headEmployee?.fullName) lines.push(`Head: ${n.headEmployee.fullName}`);
  if (n.memberCount) lines.push(`Members: ${n.memberCount}`);
  return lines.join("<br/>");
};

const toEChartsNode = (n: OrgUnitNode): Record<string, unknown> => {
  const unitChildren = (n.children ?? []).map(toEChartsNode);
  // Department members render as small grey leaf nodes so people are visible on the chart.
  const employeeChildren = (n.employees ?? []).map((e) => ({
    name: truncate(e.fullName, 22),
    symbol: "circle",
    symbolSize: 7,
    itemStyle: { color: "#94a3b8" },
    lineStyle: { color: "#e2e8f0" },
    label: { color: "#64748b", fontSize: 10 },
    tooltip: { formatter: e.fullName },
  }));
  return {
    name: nodeLabel(n),
    tooltip: { formatter: nodeTooltip(n) },
    itemStyle: { color: ORG_UNIT_TYPE_META[n.type]?.chartColor ?? "#94a3b8", borderRadius: 4 },
    children: [...unitChildren, ...employeeChildren],
  };
};

export default function OrgChart({ tree, onChanged }: { tree: OrgTree; onChanged?: () => void }) {
  const { canEdit: canAssignEmployees } = useFeaturePermissions("ats.employees");
  const [assignOpen, setAssignOpen] = useState(false);
  if (!tree.roots.length) {
    return (
      <OrgEmptyState
        icon="ri-organization-chart"
        title="No organization defined yet"
        description="Start by adding a CEO node and building your hierarchy in Structure. Once units exist, the chart will render here automatically."
        action={
          <>
            <OrgLinkButton href="/organization/structure">
              <i className="ri-add-line text-base" aria-hidden />
              Build structure
            </OrgLinkButton>
            <OrgLinkButton href="/organization/departments" variant="secondary">
              <i className="ri-building-2-line text-base" aria-hidden />
              Add departments
            </OrgLinkButton>
          </>
        }
      />
    );
  }

  const rootNodes = tree.roots.map(toEChartsNode);
  // One root (the usual single CEO): use it directly so there's no stray line above it.
  // Multiple roots: wrap in an invisible parent and hide the connecting edges.
  const data =
    rootNodes.length === 1
      ? rootNodes
      : [
          {
            name: "Organization",
            children: rootNodes.map((r) => ({ ...r, lineStyle: { opacity: 0 } })),
            itemStyle: { opacity: 0 },
            label: { show: false },
          },
        ];

  const option = {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#f8fafc", fontSize: 12 },
    },
    series: [
      {
        type: "tree",
        data,
        top: "12%",
        bottom: "14%",
        left: "3%",
        right: "3%",
        roam: true,
        layout: "orthogonal",
        orient: "TB",
        symbol: "roundRect",
        symbolSize: [12, 12],
        expandAndCollapse: true,
        initialTreeDepth: -1,
        animationDuration: 250,
        animationDurationUpdate: 200,
        lineStyle: { color: "#cbd5e1", width: 1.5, curveness: 0 },
        label: {
          position: "top",
          verticalAlign: "bottom",
          align: "center",
          distance: 6,
          fontSize: 11,
          color: "#334155",
        },
        leaves: {
          label: {
            position: "bottom",
            verticalAlign: "top",
            align: "center",
          },
        },
        emphasis: {
          focus: "descendant",
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(99, 102, 241, 0.25)" },
        },
      },
    ],
  };

  // Top-down: height grows with depth (levels), width with breadth (leaves).
  const chartHeight = Math.min(Math.max(460, (treeDepth(tree.roots) + 1) * 130), 1600);
  const minChartWidth = Math.max(640, countLeaves(tree.roots) * 90);

  return (
    <div>
      <OrgChartLegend />
      <div className="overflow-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-bodybg">
        <div style={{ minWidth: minChartWidth }}>
          <ReactECharts option={option} style={{ height: chartHeight, width: "100%" }} opts={{ renderer: "canvas" }} />
        </div>
      </div>
      <p className="mb-0 mt-3 text-[0.75rem] text-defaulttextcolor/55">
        CEO at the top, then managers, supervisors, departments, and their members. Click a node to collapse/expand, drag to pan, scroll to zoom.
      </p>

      {tree.unassigned.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-warning/25 bg-warning/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/15 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <i className="ri-user-unfollow-line" aria-hidden />
              </span>
              <div>
                <h6 className="mb-0 text-[0.875rem] font-semibold">Unassigned employees</h6>
                <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
                  Active employees not linked to a department node
                </p>
              </div>
            </div>
            <span className="badge bg-warning/15 text-warning">{tree.unassigned.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {tree.unassigned.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center rounded-full border border-defaultborder/60 bg-white px-2.5 py-1 text-[0.75rem] font-medium text-defaulttextcolor dark:bg-bodybg"
              >
                <i className="ri-user-3-line me-1 text-defaulttextcolor/45" aria-hidden />
                {e.fullName}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-warning/15 px-4 py-3">
            <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
              Assign these employees to a department to place them on the chart.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canAssignEmployees ? (
                <OrgPrimaryButton onClick={() => setAssignOpen(true)}>
                  <i className="ri-user-add-line text-base" aria-hidden />
                  Assign to department
                </OrgPrimaryButton>
              ) : null}
              <OrgLinkButton href="/ats/employees" variant="secondary">
                <i className="ri-team-line text-base" aria-hidden />
                Open employees
              </OrgLinkButton>
            </div>
          </div>
        </div>
      ) : null}

      <AssignToDepartmentModal
        open={assignOpen}
        employees={tree.unassigned}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => onChanged?.()}
      />
    </div>
  );
}
