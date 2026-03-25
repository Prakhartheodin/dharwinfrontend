import type { CandidateListItem } from "@/shared/lib/api/candidates";
import { createStudentFromUser, type Student } from "@/shared/lib/api/students";

export type AssignPersonRow =
  | {
      kind: "student";
      value: string;
      label: string;
      student: Student;
    }
  | {
      kind: "candidate_only";
      value: string;
      label: string;
      candidateId: string;
      ownerUserId: string;
      fullName: string;
      email: string;
    };

function normId(id: string): string {
  return id.trim().toLowerCase();
}

export function ownerUserIdFromListCandidate(c: CandidateListItem): string {
  if (c.ownerId != null && String(c.ownerId).trim()) return String(c.ownerId).trim();
  const o = c.owner;
  if (typeof o === "string" && o.trim()) return o.trim();
  if (o && typeof o === "object") return String(o._id ?? o.id ?? "").trim();
  return "";
}

function studentIdFromListCandidate(c: CandidateListItem): string {
  const s = c.studentId;
  if (s == null || s === "") return "";
  return String(s).trim();
}

/**
 * Training students plus current candidates who do not already have a row in the training list
 * (same owner user or linked student id). Candidate rows use candidate APIs for shift/week-off;
 * holiday assignment still needs a training profile (see resolveStudentIdsForHolidayAssign).
 */
export function buildMergedAssignPeopleOptions(
  students: Student[],
  candidates: CandidateListItem[]
): AssignPersonRow[] {
  const studentRows: AssignPersonRow[] = students
    .map((s) => {
      const rawId = (s as { id?: string; _id?: string }).id ?? (s as { _id?: string })._id;
      const id = rawId != null ? String(rawId).trim() : "";
      return {
        kind: "student" as const,
        value: id,
        label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? "No email"}) · Training`,
        student: s,
      };
    })
    .filter((o) => o.value);

  const studentIds = new Set(studentRows.map((r) => normId(r.value)).filter(Boolean));
  const ownerUserIds = new Set<string>();
  for (const s of students) {
    const u = s.user;
    const uid =
      typeof u === "object" && u
        ? String((u as { id?: string; _id?: string }).id ?? (u as { _id?: string })._id ?? "").trim()
        : "";
    if (uid) ownerUserIds.add(normId(uid));
  }

  function hasTrainingRow(c: CandidateListItem): boolean {
    const sid = studentIdFromListCandidate(c);
    if (sid && studentIds.has(normId(sid))) return true;
    const oid = ownerUserIdFromListCandidate(c);
    if (oid && ownerUserIds.has(normId(oid))) return true;
    return false;
  }

  const candidateRows: AssignPersonRow[] = [];
  for (const c of candidates) {
    if (c.isActive === false) continue;
    if (c.resignDate) continue;
    if (hasTrainingRow(c)) continue;
    const cid = String(c._id ?? c.id ?? "").trim();
    const oid = ownerUserIdFromListCandidate(c);
    if (!cid || !oid) continue;
    candidateRows.push({
      kind: "candidate_only",
      value: `candidate:${cid}`,
      label: `${c.fullName || "Unknown"} (${c.email || "No email"}) · Candidate`,
      candidateId: cid,
      ownerUserId: oid,
      fullName: c.fullName || "",
      email: c.email || "",
    });
  }

  candidateRows.sort((a, b) => a.label.localeCompare(b.label));
  studentRows.sort((a, b) => a.label.localeCompare(b.label));
  return [...studentRows, ...candidateRows];
}

export type StudentAssignRow = Extract<AssignPersonRow, { kind: "student" }>;
export type CandidateOnlyAssignRow = Extract<AssignPersonRow, { kind: "candidate_only" }>;

export function partitionAssignPersonRows(rows: AssignPersonRow[]): {
  studentRows: StudentAssignRow[];
  candidateRows: CandidateOnlyAssignRow[];
} {
  const studentRows = rows.filter((r): r is StudentAssignRow => r.kind === "student");
  const candidateRows = rows.filter((r): r is CandidateOnlyAssignRow => r.kind === "candidate_only");
  return { studentRows, candidateRows };
}

/**
 * Holiday assign/remove APIs are training-student based. Candidate-only rows get a profile first
 * (backend may add Student role when the owner has a Candidate profile — requires `students.manage`).
 */
export async function resolveStudentIdsForHolidayAssign(rows: AssignPersonRow[]): Promise<string[]> {
  const ids: string[] = [];
  for (const r of rows) {
    if (r.kind === "student") {
      ids.push(r.value);
      continue;
    }
    const created = await createStudentFromUser(r.ownerUserId, {
      ensureStudentRoleForCandidateOwner: true,
    });
    const rawId = (created as { id?: string; _id?: string }).id ?? (created as { _id?: string })._id;
    ids.push(String(rawId));
  }
  return ids;
}
