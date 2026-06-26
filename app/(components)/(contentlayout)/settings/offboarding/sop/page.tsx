"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import {
  getOffboardingConfig,
  saveOffboardingConfig,
  getOffboardingStatus,
  runOffboardingStep,
  type OffboardingStep,
  type OffboardingStatus,
  type OffboardingActionKey,
} from "@/shared/lib/api/offboardingSop";

const ACTION_KEYS: OffboardingActionKey[] = ["email_deactivated", "tasks_reassigned", "org_team_disabled"];
const isAction = (k: string): k is OffboardingActionKey => (ACTION_KEYS as string[]).includes(k);

export default function OffboardingSopSettingsPage() {
  const [steps, setSteps] = useState<OffboardingStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<OffboardingStatus | null>(null);
  const [busyKey, setBusyKey] = useState<string>("");

  useEffect(() => {
    getOffboardingConfig().then((c) => setSteps(c.steps)).catch(() => setMsg("Failed to load config"));
  }, []);

  const updateStep = (i: number, patch: Partial<OffboardingStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const onSave = useCallback(async () => {
    setSaving(true);
    setMsg("");
    try {
      const c = await saveOffboardingConfig(steps);
      setSteps(c.steps);
      setMsg("Saved");
    } catch {
      setMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }, [steps]);

  const loadPreview = useCallback(async () => {
    if (!employeeId.trim()) return;
    setStatus(await getOffboardingStatus(employeeId.trim()));
  }, [employeeId]);

  const runStep = useCallback(
    async (stepKey: OffboardingActionKey) => {
      setBusyKey(stepKey);
      try {
        let body: { toUserIds?: string[] } | undefined;
        if (stepKey === "tasks_reassigned") {
          const to = window.prompt("Reassign open tasks to user id:");
          if (!to) return;
          body = { toUserIds: [to.trim()] };
        }
        setStatus(await runOffboardingStep(employeeId.trim(), stepKey, body));
      } finally {
        setBusyKey("");
      }
    },
    [employeeId]
  );

  return (
    <>
      <Seo title="Exit SOP" />
      <div className="box">
        <div className="box-header">
          <h5 className="box-title">Exit SOP (Offboarding checklist)</h5>
        </div>
        <div className="box-body space-y-4">
          {steps.map((s, i) => (
            <div key={s.checkerKey} className="flex items-center gap-3 border-b border-defaultborder/60 pb-3">
              <input
                type="checkbox"
                checked={s.enabled !== false}
                onChange={(e) => updateStep(i, { enabled: e.target.checked })}
                aria-label={`Enable ${s.label}`}
              />
              <input
                className="form-control flex-1"
                value={s.label}
                onChange={(e) => updateStep(i, { label: e.target.value })}
              />
              <input
                type="number"
                className="form-control w-20"
                value={s.sortOrder}
                onChange={(e) => updateStep(i, { sortOrder: Number(e.target.value) })}
                aria-label={`Order for ${s.label}`}
              />
              <span className="text-xs text-gray-500">{s.checkerKey}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button type="button" className="ti-btn ti-btn-primary" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {msg ? <span className="text-sm text-gray-500">{msg}</span> : null}
          </div>
        </div>
      </div>

      <div className="box mt-4">
        <div className="box-header">
          <h5 className="box-title">Checklist preview</h5>
        </div>
        <div className="box-body space-y-3">
          <div className="flex gap-2">
            <input
              className="form-control flex-1"
              placeholder="Employee id (resigned)"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
            <button type="button" className="ti-btn ti-btn-secondary" onClick={loadPreview}>
              Load
            </button>
          </div>

          {status?.skipped ? (
            <p className="text-sm text-gray-500">No exit checklist — this employee has no resignation date set.</p>
          ) : status ? (
            <>
              <p className="text-sm">
                {status.completedCount} of {status.totalCount} complete
              </p>
              {status.steps.map((s) => (
                <div key={s.checkerKey} className="flex items-center justify-between border-b border-defaultborder/60 py-2">
                  <span className={s.done ? "text-green-600" : ""}>
                    {s.done ? "✓ " : "○ "}
                    {s.label}
                  </span>
                  {!s.done && isAction(s.checkerKey) ? (
                    <button
                      type="button"
                      className="ti-btn ti-btn-sm ti-btn-primary"
                      disabled={busyKey === s.checkerKey}
                      onClick={() => runStep(s.checkerKey as OffboardingActionKey)}
                    >
                      {busyKey === s.checkerKey ? "Working…" : "Run"}
                    </button>
                  ) : !s.done && s.linkTemplate ? (
                    <a className="ti-btn ti-btn-sm ti-btn-secondary" href={s.linkTemplate}>
                      Open
                    </a>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
