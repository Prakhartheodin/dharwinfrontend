"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import {
  listRubricTemplates,
  type RubricTemplate,
} from "@/shared/lib/api/rubricTemplates";
import { getApiErrorMessage } from "@/shared/lib/api/client";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "../interviews/_components/interviewLinkage";
import RubricTemplateEditor, { DEFAULT_RUBRIC_CRITERIA } from "./_components/RubricTemplateEditor";

function appliesToLabel(template: RubricTemplate): string {
  const parts: string[] = [];
  if (template.appliesTo?.jobId) parts.push("Job-specific");
  const rt = template.appliesTo?.roundType;
  if (rt) {
    const label = INTERVIEW_ROUND_TYPE_OPTIONS.find((o) => o.value === rt)?.label || rt;
    parts.push(label);
  }
  if (!parts.length) return "All interviews";
  return parts.join(" · ");
}

function criteriaWeightTotal(template: RubricTemplate): number {
  return (template.criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
}

export default function InterviewRubricsPage() {
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<RubricTemplate | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRubricTemplates(showArchived);
      setTemplates(res.results || []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not load rubrics."));
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing("new");
  };

  const openEdit = (template: RubricTemplate) => {
    setEditing(template);
  };

  const closeEditor = () => {
    setEditing(null);
  };

  const handleSaved = async () => {
    setEditing(null);
    await load();
  };

  const editorTemplate =
    editing === "new"
      ? {
          id: "",
          name: "",
          description: "",
          criteria: DEFAULT_RUBRIC_CRITERIA,
          appliesTo: { jobId: null, roundType: null },
          isDefault: false,
          archivedAt: null,
          createdAt: "",
          updatedAt: "",
        }
      : editing;

  return (
    <>
      <Seo title="Interview Rubrics" />
      <div className="container-fluid pt-6">
        <div className="box custom-box">
          <div className="box-header flex flex-wrap items-center justify-between gap-3 border-b border-defaultborder/60 px-4 py-4 sm:px-6">
            <div>
              <h1 className="text-lg font-semibold text-defaulttextcolor dark:text-white">Interview rubrics</h1>
              <p className="mt-1 text-sm text-defaulttextcolor/70 dark:text-white/70">
                Weighted criteria used when interviewers score a round.
              </p>
            </div>
            {!editing && (
              <button type="button" className="ti-btn ti-btn-primary !text-sm" onClick={openNew}>
                New rubric
              </button>
            )}
          </div>

          <div className="box-body px-4 py-4 sm:px-6">
            {editing && editorTemplate ? (
              <RubricTemplateEditor
                template={editing === "new" ? null : editing}
                onSaved={() => void handleSaved()}
                onCancel={closeEditor}
              />
            ) : (
              <>
                <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="ti-form-checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show archived
                </label>

                {loading && (
                  <div className="animate-pulse space-y-2">
                    <div className="h-10 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-10 rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
                    <p>{error}</p>
                    <button type="button" className="ti-btn ti-btn-light mt-2 !text-xs" onClick={() => void load()}>
                      Retry
                    </button>
                  </div>
                )}

                {!loading && !error && templates.length === 0 && (
                  <div className="rounded-lg border border-dashed border-defaultborder/80 p-8 text-center">
                    <p className="font-medium text-defaulttextcolor dark:text-white">No rubrics yet</p>
                    <p className="mt-2 text-sm text-defaulttextcolor/70 dark:text-white/70">
                      Rounds fall back to the built-in default rubric until you create one here.
                    </p>
                    <button type="button" className="ti-btn ti-btn-primary mt-4 !text-sm" onClick={openNew}>
                      New rubric
                    </button>
                  </div>
                )}

                {!loading && !error && templates.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-defaultborder/70 dark:border-white/10">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          <th className="px-3 py-2 text-start font-medium">Name</th>
                          <th className="px-3 py-2 text-start font-medium">Applies to</th>
                          <th className="px-3 py-2 text-start font-medium tabular-nums">Criteria</th>
                          <th className="px-3 py-2 text-start font-medium tabular-nums">Weights</th>
                          <th className="px-3 py-2 text-start font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {templates.map((t) => (
                          <tr
                            key={t.id}
                            className={`border-t border-defaultborder/50 dark:border-white/10 ${
                              t.archivedAt ? "opacity-60" : ""
                            }`}
                          >
                            <td className="px-3 py-2 font-medium text-defaulttextcolor dark:text-white">
                              {t.name}
                              {t.isDefault && (
                                <span className="ms-2 rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] text-primary">
                                  Default
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-defaulttextcolor/80 dark:text-white/80">{appliesToLabel(t)}</td>
                            <td className="px-3 py-2 tabular-nums">{t.criteria?.length ?? 0}</td>
                            <td className="px-3 py-2 tabular-nums">{criteriaWeightTotal(t)}%</td>
                            <td className="px-3 py-2 text-end">
                              <button
                                type="button"
                                className="text-primary hover:underline text-xs"
                                onClick={() => openEdit(t)}
                              >
                                {t.archivedAt ? "View / restore" : "Edit"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
