"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { listAllUsers } from "@/shared/lib/api/users";
import { getUserAvailability } from "@/shared/lib/api/interviewScheduling";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";

const Select = dynamic(() => import("react-select"), { ssr: false });

type Option = { value: string; label: string };
/** "set" = has weekly hours; "empty" = none, so never offered; absent = not checked / no access. */
type AvailabilityStatus = "set" | "empty";

const AVAILABILITY_HREF = "/settings/interview-availability";

/**
 * Multi-select of active users who can take AI-scheduled interviews for a job.
 * Value is a list of user ids (Job.interviewerPool).
 *
 * Availability hints use GET /interview-scheduling/availability/:userId, one call per newly selected
 * person. That route needs Administrator or interviews.manage; on 401/403 the hints are skipped silently.
 */
export default function InterviewerPoolSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { menuPortalTarget, styles } = usePmReactSelectStyles(9999);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [status, setStatus] = useState<Record<string, AvailabilityStatus>>({});
  const [canCheck, setCanCheck] = useState(true);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    listAllUsers({ status: "active" })
      .then((users) => {
        if (cancelled) return;
        setOptions(
          users.map((u) => ({
            value: u.id,
            label: u.name ? `${u.name} (${u.email})` : u.email,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canCheck) return;
    for (const id of value) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      getUserAvailability(id)
        .then((a) => setStatus((s) => ({ ...s, [id]: (a?.weekly?.length ?? 0) > 0 ? "set" : "empty" })))
        .catch((e: unknown) => {
          const code = (e as { response?: { status?: number } })?.response?.status;
          if (code === 403 || code === 401) setCanCheck(false);
          else requested.current.delete(id);
        });
    }
  }, [value, canCheck]);

  const selected = useMemo(
    () => value.map((id) => options.find((o) => o.value === id) ?? { value: id, label: id }),
    [value, options]
  );

  const nameOf = (id: string) => (options.find((o) => o.value === id)?.label ?? id).replace(/\s*\([^)]*\)$/, "");
  const missing = canCheck ? value.filter((id) => status[id] === "empty") : [];
  const allChecked = canCheck && value.length > 0 && value.every((id) => status[id]);

  return (
    <section className="mt-6 border-t border-gray-200 pt-6 dark:border-defaultborder/10">
      <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white">AI interview scheduling</h3>
      <p className="mt-1 text-sm text-textmuted dark:text-white/60">
        The AI agent offers candidates interview slots from these people&apos;s availability. Only people who have set
        weekly hours in{" "}
        <Link href={AVAILABILITY_HREF} className="text-primary underline-offset-2 hover:underline">
          Settings → Interview Availability
        </Link>{" "}
        get booked. Leave empty to turn off auto-scheduling for this job.
      </p>

      <div className="mt-4 max-w-2xl">
        <label htmlFor="interviewer-pool" className="form-label">
          Interviewer pool
        </label>
        <Select
          inputId="interviewer-pool"
          instanceId="interviewer-pool"
          isMulti
          isLoading={loading}
          options={options}
          value={selected}
          onChange={(v: unknown) => onChange(((v as Option[] | null) ?? []).map((o) => o.value))}
          className="ti-form-select !p-0"
          classNamePrefix="Select2"
          placeholder="Select interviewers"
          noOptionsMessage={() => (loadFailed ? "Could not load users" : "No matching users")}
          menuPlacement="auto"
          menuPortalTarget={menuPortalTarget}
          styles={styles}
        />
        {loadFailed && (
          <p className="mt-1 mb-0 text-xs text-danger" role="alert">
            <i className="ri-error-warning-line me-1" aria-hidden />
            Could not load the user list. Reload the page to try again.
          </p>
        )}
        <div aria-live="polite">
          {missing.length > 0 ? (
            <p className="mt-2 mb-0 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-defaulttextcolor">
              <i className="ri-alert-line me-1 text-warning" aria-hidden />
              <strong>No weekly hours set:</strong> {missing.map(nameOf).join(", ")}. They won&apos;t be offered to
              candidates until availability is added.
            </p>
          ) : allChecked ? (
            <p className="mt-2 mb-0 text-xs text-success">
              <i className="ri-checkbox-circle-line me-1" aria-hidden />
              Everyone selected has weekly hours set.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
