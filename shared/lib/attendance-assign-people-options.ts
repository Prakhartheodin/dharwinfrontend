import type { CandidateListItem } from "@/shared/lib/api/candidates";
import { createStudentFromUser, type Student } from "@/shared/lib/api/students";
import type { FilterOptionOption } from "react-select";

export type AssignPersonRow =
  | {
      kind: "student";
      value: string;
      label: string;
      student: Student;
      /** Company employee ID when known (for search, mirrors label). */
      employeeId?: string | null;
    }
  | {
      kind: "candidate_only";
      value: string;
      label: string;
      candidateId: string;
      ownerUserId: string;
      fullName: string;
      email: string;
      employeeId?: string | null;
    };

function normId(id: string): string {
  return id.trim().toLowerCase();
}

/** Parens line: company employee ID when present, else work login email (search still matches label text). */
function formatAssigneeDisplaySecondary(employeeId: string | null | undefined, email: string | null | undefined): string {
  const id = (employeeId ?? "").trim();
  if (id) return id;
  return (email ?? "").trim() || "—";
}

function userIdNormFromStudent(s: Student): string {
  const u = s.user;
  if (!u || typeof u !== "object") return "";
  const raw = (u as { id?: string; _id?: string }).id ?? (u as { _id?: string })._id;
  return raw != null && String(raw).trim() ? normId(String(raw)) : "";
}

/**
 * For training students, employeeId lives on the employee record; map owner user → employeeId from the full candidate list.
 */
function buildOwnerUserIdToEmployeeId(candidates: CandidateListItem[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of candidates) {
    const oid = ownerUserIdFromListCandidate(c);
    if (!oid) continue;
    const key = normId(oid);
    if (m.has(key)) continue;
    const eid = (c.employeeId ?? "").trim();
    if (eid) m.set(key, eid);
  }
  return m;
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

function textIncludesI(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

/**
 * For react-select "Select people" (shift / week-off / holidays). Searches by label, full name, email, and employee ID.
 */
export function filterAssignPersonSelectOption(
  option: FilterOptionOption<unknown>,
  inputValue: string
): boolean {
  const input = (inputValue ?? "").trim();
  if (!input) return true;
  if (textIncludesI(String(option.label ?? ""), input)) return true;
  const data = option.data;
  if (data == null || typeof data !== "object" || !("kind" in data)) {
    return false;
  }
  const row = data as AssignPersonRow;
  if (row.kind === "student") {
    const u = row.student?.user;
    if (u?.name && textIncludesI(u.name, input)) return true;
    if (u?.email && textIncludesI(u.email, input)) return true;
    if (row.employeeId && textIncludesI(String(row.employeeId), input)) return true;
    return false;
  }
  if (row.kind === "candidate_only") {
    if (row.fullName && textIncludesI(row.fullName, input)) return true;
    if (row.email && textIncludesI(row.email, input)) return true;
    if (row.employeeId && textIncludesI(String(row.employeeId), input)) return true;
    return false;
  }
  return false;
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
  const ownerToEmployeeId = buildOwnerUserIdToEmployeeId(candidates);

  const studentRows: AssignPersonRow[] = students
    .map((s) => {
      const rawId = (s as { id?: string; _id?: string }).id ?? (s as { _id?: string })._id;
      const id = rawId != null ? String(rawId).trim() : "";
      const uid = userIdNormFromStudent(s);
      const fromEmployee = uid ? ownerToEmployeeId.get(uid) : undefined;
      const email = s.user?.email ?? "";
      const secondary = formatAssigneeDisplaySecondary(fromEmployee, email);
      const employeeId = fromEmployee && String(fromEmployee).trim() ? String(fromEmployee).trim() : null;
      return {
        kind: "student" as const,
        value: id,
        label: `${s.user?.name ?? "Unknown"} (${secondary}) · Training`,
        student: s,
        employeeId,
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
    const secondary = formatAssigneeDisplaySecondary(c.employeeId, c.email);
    const eid = c.employeeId != null && String(c.employeeId).trim() ? String(c.employeeId).trim() : null;
    candidateRows.push({
      kind: "candidate_only",
      value: `candidate:${cid}`,
      label: `${c.fullName || "Unknown"} (${secondary}) · Employee`,
      candidateId: cid,
      ownerUserId: oid,
      fullName: c.fullName || "",
      email: c.email || "",
      employeeId: eid,
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
