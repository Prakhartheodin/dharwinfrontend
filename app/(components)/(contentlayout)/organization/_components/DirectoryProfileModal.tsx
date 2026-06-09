"use client";

import { useEffect, useState } from "react";
import { getCandidate, type CandidateListItem } from "@/shared/lib/api/employees";
import { OrgModal, OrgModalCancelButton } from "./org-ui";

export type DirectoryEmployee = {
  id: string;
  fullName: string;
  email: string;
  designation: string;
  departmentName: string;
};

type Props = {
  open: boolean;
  employee: DirectoryEmployee | null;
  onClose: () => void;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/50">{label}</p>
      <p className="mb-0 text-[0.875rem] text-defaulttextcolor">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h6 className="mb-2 text-[0.8125rem] font-semibold text-defaulttextcolor">{title}</h6>
      {children}
    </div>
  );
}

export default function DirectoryProfileModal({ open, employee, onClose }: Props) {
  const [detail, setDetail] = useState<CandidateListItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    getCandidate(employee.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, employee]);

  const designation = detail?.designation || employee?.designation || "";
  const department = detail?.department || employee?.departmentName || "";
  const skills = detail?.skills ?? [];
  const experiences = detail?.experiences ?? [];
  const qualifications = detail?.qualifications ?? [];

  return (
    <OrgModal
      open={open && !!employee}
      size="lg"
      title="Employee profile"
      subtitle="Read-only profile. Edit in ATS when you need to make changes."
      onClose={onClose}
      footer={
        <OrgModalCancelButton type="button" onClick={onClose}>
          Close
        </OrgModalCancelButton>
      }
    >
      {employee ? (
        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.95rem] font-semibold text-primary">
              {initials(employee.fullName)}
            </span>
            <div className="min-w-0">
              <p className="mb-0 truncate text-[1rem] font-semibold text-defaulttextcolor">{employee.fullName}</p>
              <p className="mb-0 truncate text-[0.8125rem] text-defaulttextcolor/60">{designation || "—"}</p>
            </div>
            {detail ? (
              <span
                className={`ms-auto shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
                  detail.isActive === false ? "bg-secondary/10 text-secondary" : "bg-success/10 text-success"
                }`}
              >
                {detail.isActive === false ? "Inactive" : "Active"}
              </span>
            ) : null}
          </div>

          <Section title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={detail?.email || employee.email} />
              <Field label="Phone" value={detail?.phoneNumber ?? ""} />
              <Field label="Department" value={department} />
              <Field label="Employee ID" value={detail?.employeeId ?? ""} />
              <Field label="Joining date" value={fmtDate(detail?.joiningDate)} />
            </div>
          </Section>

          {loading ? (
            <p className="mb-0 text-[0.8125rem] text-defaulttextcolor/55">Loading full profile…</p>
          ) : null}

          {skills.length ? (
            <Section title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <span
                    key={`${s.name}-${i}`}
                    className="rounded-full border border-defaultborder/60 px-2.5 py-1 text-[0.75rem] text-defaulttextcolor/80"
                  >
                    {s.name}
                    {s.level ? <span className="text-defaulttextcolor/45"> · {s.level}</span> : null}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          {experiences.length ? (
            <Section title="Experience">
              <ul className="mb-0 space-y-2">
                {experiences.map((e, i) => (
                  <li key={`${e.company}-${i}`} className="rounded-lg border border-defaultborder/50 px-3 py-2">
                    <p className="mb-0 text-[0.8125rem] font-medium text-defaulttextcolor">{e.role || "—"}</p>
                    <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
                      {e.company || "—"}
                      {e.startDate || e.endDate ? (
                        <span>
                          {" · "}
                          {fmtDate(e.startDate)} – {e.currentlyWorking ? "Present" : fmtDate(e.endDate)}
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {qualifications.length ? (
            <Section title="Qualifications">
              <ul className="mb-0 space-y-1">
                {qualifications.map((q, i) => (
                  <li key={`${q.degree}-${i}`} className="text-[0.8125rem] text-defaulttextcolor/80">
                    {q.degree}
                    {q.institute ? <span className="text-defaulttextcolor/55"> — {q.institute}</span> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      ) : null}
    </OrgModal>
  );
}
