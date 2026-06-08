"use client";

import ReactECharts from "echarts-for-react";
import type { OrgTree, OrgUnitNode } from "@/shared/lib/api/org-structure";
import { ORG_UNIT_TYPE_META, OrgChartLegend, OrgEmptyState, OrgLinkButton } from "./org-ui";

const toEChartsNode = (n: OrgUnitNode): Record<string, unknown> => ({
  name: `${n.name}${n.memberCount ? ` (${n.memberCount})` : ""}`,
  itemStyle: { color: ORG_UNIT_TYPE_META[n.type]?.chartColor ?? "#94a3b8", borderRadius: 4 },
  children: (n.children ?? []).map(toEChartsNode),
});

export default function OrgChart({ tree }: { tree: OrgTree }) {
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

  const data = [
    {
      name: "Organization",
      children: tree.roots.map(toEChartsNode),
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
        top: "4%",
        bottom: "4%",
        left: "8%",
        right: "18%",
        layout: "orthogonal",
        orient: "LR",
        symbol: "roundRect",
        symbolSize: [10, 10],
        expandAndCollapse: true,
        initialTreeDepth: 3,
        animationDuration: 250,
        animationDurationUpdate: 200,
        lineStyle: { color: "#cbd5e1", width: 1.5, curveness: 0.4 },
        label: {
          position: "left",
          verticalAlign: "middle",
          align: "right",
          fontSize: 12,
          color: "#334155",
        },
        leaves: {
          label: {
            position: "right",
            verticalAlign: "middle",
            align: "left",
          },
        },
        emphasis: {
          focus: "descendant",
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(99, 102, 241, 0.25)" },
        },
      },
    ],
  };

  return (
    <div>
      <OrgChartLegend />
      <div className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white dark:bg-bodybg">
        <ReactECharts option={option} style={{ height: 620, width: "100%" }} opts={{ renderer: "canvas" }} />
      </div>
      <p className="mb-0 mt-3 text-[0.75rem] text-defaulttextcolor/55">
        Click nodes to expand or collapse branches. Hover for unit details.
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
        </div>
      ) : null}
    </div>
  );
}
