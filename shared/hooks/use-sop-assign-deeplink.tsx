"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getCandidate } from "@/shared/lib/api/candidates";
import { getStudent, type Student } from "@/shared/lib/api/students";

export function decodeSopQueryName(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeId(id: string | null | undefined): string {
  return String(id ?? "").trim().toLowerCase();
}

function normEmail(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

/** Training row, candidate-only row (shift/week-off via candidate APIs), or merged SOP injection. */
export type SopAssignSelectRow = {
  value: string;
  label: string;
  kind?: "student" | "candidate_only";
  student?: Student;
  candidateId?: string;
  ownerUserId?: string;
  fullName?: string;
  email?: string;
};

function getUserName(o: SopAssignSelectRow): string {
  if (o.kind === "candidate_only" && o.fullName?.trim()) return String(o.fullName);
  const u = o.student?.user;
  if (u && typeof u === "object" && "name" in u && u.name != null) return String(u.name);
  return "";
}

function getUserEmail(o: SopAssignSelectRow): string {
  if (o.kind === "candidate_only" && o.email != null) return normEmail(o.email);
  const u = o.student?.user;
  if (u && typeof u === "object" && "email" in u && u.email != null) return normEmail(u.email);
  return "";
}

function getStudentUserIdFromRow(o: SopAssignSelectRow): string {
  if (o.kind === "candidate_only" && o.ownerUserId) return normalizeId(o.ownerUserId);
  const u = o.student?.user;
  if (typeof u === "string") return normalizeId(u);
  if (u && typeof u === "object") {
    const raw =
      "id" in u && u.id != null
        ? String(u.id)
        : "_id" in u && u._id != null
          ? String(u._id)
          : "";
    return normalizeId(raw);
  }
  return "";
}

/** Prefer App Router search params; fall back to window (e.g. full reload). */
function buildMergedQueryString(routerSearchString: string): string {
  const fromRouter = routerSearchString.trim();
  if (typeof window === "undefined") return fromRouter;
  const fromWin =
    window.location.search.length > 1 ? window.location.search.slice(1) : "";
  return fromRouter || fromWin;
}

function ownerIdFromCandidateRecord(c: {
  owner?: string | { _id?: string; id?: string } | null;
  ownerId?: string | null;
  studentId?: string | null;
  email?: string;
}): { ownerUserId: string; linkedStudentId: string; candidateEmail: string } {
  let ownerUserId = "";
  if (c.ownerId != null && String(c.ownerId).trim()) {
    ownerUserId = String(c.ownerId).trim();
  } else {
    const o = c.owner;
    if (typeof o === "string" && o.trim()) ownerUserId = o.trim();
    else if (o && typeof o === "object") {
      ownerUserId = String(o._id ?? o.id ?? "").trim();
    }
  }
  const linkedStudentId = String(c.studentId ?? "").trim();
  const candidateEmail = normEmail(c.email);
  return { ownerUserId, linkedStudentId, candidateEmail };
}

/** e.g. "Jaymin Test" matches "jaymin test" or user name containing both tokens */
function nameTokensMatch(candidateDecoded: string, userName: string): boolean {
  const userNorm = normName(userName);
  const candNorm = normName(candidateDecoded);
  if (!candNorm || !userNorm) return false;
  if (candNorm === userNorm) return true;
  const tokens = candNorm.split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return candNorm.length >= 2 && userNorm.includes(candNorm);
  return tokens.every((t) => userNorm.includes(t));
}

function findStudentOptionSync<T extends SopAssignSelectRow>(students: T[], sp: URLSearchParams): T | undefined {
  const cidParam = sp.get("candidateId")?.trim();
  const sid = sp.get("studentId")?.trim();
  const ownerUserId = sp.get("ownerUserId")?.trim();
  const nameDecoded = decodeSopQueryName(sp.get("candidateName"));
  const oid = normalizeId(ownerUserId);
  const sidNorm = sid ? normalizeId(sid) : "";

  let opt: T | undefined;

  if (cidParam) {
    opt = students.find(
      (o) =>
        o.kind === "candidate_only" &&
        o.candidateId != null &&
        normalizeId(o.candidateId) === normalizeId(cidParam)
    );
    if (opt) return opt;
  }

  if (oid) {
    opt = students.find((o) => {
      const uid = getStudentUserIdFromRow(o);
      return uid !== "" && uid === oid;
    });
  }
  if (!opt && sidNorm) {
    opt = students.find((o) => normalizeId(o.value) === sidNorm);
  }
  if (!opt && nameDecoded) {
    const exact = students.filter((o) => {
      const n = getUserName(o);
      return n !== "" && normName(n) === normName(nameDecoded);
    });
    if (exact.length === 1) opt = exact[0];
    else if (exact.length === 0) {
      const loose = students.filter((o) => {
        const n = getUserName(o);
        return n !== "" && nameTokensMatch(nameDecoded, n);
      });
      if (loose.length === 1) opt = loose[0];
    }
  }
  return opt;
}

function studentApiToSelectRow(s: Student): SopAssignSelectRow {
  const rawId = (s as { id?: string; _id?: string }).id ?? (s as { _id?: string })._id;
  const id = rawId != null ? String(rawId).trim() : "";
  return {
    kind: "student",
    value: id,
    label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? "No email"}) · Training`,
    student: s,
  };
}

function pickLiveOption<T extends SopAssignSelectRow>(students: T[], opt: T): T | undefined {
  const id = normalizeId(opt.value);
  if (!id) return undefined;
  return students.find((s) => normalizeId(s.value) === id);
}

type ResolveOutcome<T> = { opt?: T; deferSelect: boolean };

/**
 * Match training student to SOP deep-link using GET candidate + optional GET student when the
 * profile is missing from listStudents (inactive, new, etc.).
 */
async function resolveStudentRowForCandidateId<T extends SopAssignSelectRow>(
  candidateId: string,
  students: T[],
  mergeStudentRow?: (row: T) => void
): Promise<ResolveOutcome<T>> {
  const id = candidateId.trim();
  if (!id) return { deferSelect: false };
  let c: Awaited<ReturnType<typeof getCandidate>>;
  try {
    c = await getCandidate(id);
  } catch {
    return { deferSelect: false };
  }
  const { ownerUserId, linkedStudentId, candidateEmail } = ownerIdFromCandidateRecord(c);
  const on = normalizeId(ownerUserId);
  if (on) {
    const byOwner = students.find((o) => getStudentUserIdFromRow(o) === on);
    if (byOwner) return { opt: byOwner, deferSelect: false };
  }
  if (linkedStudentId) {
    const sn = normalizeId(linkedStudentId);
    const byStudent = students.find((o) => normalizeId(o.value) === sn);
    if (byStudent) return { opt: byStudent, deferSelect: false };
  }
  if (candidateEmail) {
    const byEmail = students.find((o) => getUserEmail(o) === candidateEmail);
    if (byEmail) return { opt: byEmail, deferSelect: false };
  }
  const fullName = typeof c.fullName === "string" ? c.fullName : "";
  if (fullName.trim()) {
    const loose = students.filter((o) => {
      const n = getUserName(o);
      return n !== "" && nameTokensMatch(fullName, n);
    });
    if (loose.length === 1) return { opt: loose[0], deferSelect: false };
  }
  if (linkedStudentId && mergeStudentRow) {
    try {
      const s = await getStudent(linkedStudentId);
      const row = studentApiToSelectRow(s) as T;
      if (!row.value) return { deferSelect: false };
      mergeStudentRow(row);
      return { opt: row, deferSelect: true };
    } catch {
      /* try candidate-only row below */
    }
  }
  if (mergeStudentRow) {
    const candId = String((c as { id?: string; _id?: string }).id ?? (c as { _id?: string })._id ?? "").trim();
    const ou = ownerUserId.trim();
    if (candId && ou) {
      const row = {
        kind: "candidate_only" as const,
        value: `candidate:${candId}`,
        label: `${typeof c.fullName === "string" && c.fullName.trim() ? c.fullName : "Unknown"} (${typeof c.email === "string" && c.email.trim() ? c.email : "No email"}) · Candidate`,
        candidateId: candId,
        ownerUserId: ou,
        fullName: typeof c.fullName === "string" ? c.fullName : "",
        email: typeof c.email === "string" ? c.email : "",
      } as T;
      mergeStudentRow(row);
      return { opt: row, deferSelect: true };
    }
  }
  return { deferSelect: false };
}

/**
 * Pre-fills student multi-select from SOP deep links.
 * @param mergeStudentRow — If the linked training student is not in `students` (e.g. inactive), fetch by id and merge into the list so react-select can show them.
 */
export function useSopPreselectStudents<T extends SopAssignSelectRow>(
  students: T[],
  setSelected: (opts: T[]) => void,
  routerSearchString: string,
  mergeStudentRow?: (row: T) => void
): void {
  /** Only set after we have applied selection or given up (avoids blocking a second pass after mergeStudentRow updates `students`). */
  const doneForQsRef = useRef<string | null>(null);
  const studentsRef = useRef(students);
  studentsRef.current = students;

  useEffect(() => {
    if (students.length === 0) return;

    const mergedQs = buildMergedQueryString(routerSearchString);
    if (!mergedQs) return;

    const sp = new URLSearchParams(mergedQs);
    const cid = sp.get("candidateId")?.trim();
    const sid = sp.get("studentId")?.trim();
    const ownerUserId = sp.get("ownerUserId")?.trim();
    const nameDecoded = decodeSopQueryName(sp.get("candidateName"));
    if (!cid && !sid && !nameDecoded && !ownerUserId) return;

    if (doneForQsRef.current === mergedQs) return;

    let cancelled = false;

    const markDone = () => {
      if (!cancelled) doneForQsRef.current = mergedQs;
    };

    const syncOpt = findStudentOptionSync(students, sp);
    if (syncOpt) {
      const live = pickLiveOption(students, syncOpt) ?? syncOpt;
      setSelected([live]);
      markDone();
      return () => {
        cancelled = true;
      };
    }

    if (!cid) {
      markDone();
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const { opt: via, deferSelect } = await resolveStudentRowForCandidateId<T>(
        cid,
        studentsRef.current,
        mergeStudentRow as ((row: T) => void) | undefined
      );
      if (cancelled) return;
      if (!via) {
        markDone();
        return;
      }
      const applySelection = () => {
        if (cancelled) return;
        const latest = studentsRef.current;
        const live = pickLiveOption(latest, via) ?? via;
        setSelected([live]);
        markDone();
      };
      if (deferSelect) {
        queueMicrotask(() => requestAnimationFrame(applySelection));
      } else {
        applySelection();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [students, setSelected, routerSearchString, mergeStudentRow]);
}

/** Shows candidate name when opened from SOP links (uses Next search params + window fallback). */
export function SopAssignChecklistNotice({ className = "" }: { className?: string }) {
  const searchParams = useSearchParams();
  const routerQs = searchParams.toString();
  const mergedQs = buildMergedQueryString(routerQs);
  const sp = new URLSearchParams(mergedQs);
  const cid = sp.get("candidateId");
  const sid = sp.get("studentId");
  const ownerUserId = sp.get("ownerUserId");
  const name = decodeSopQueryName(sp.get("candidateName"));
  const hasAny = Boolean(cid || sid || name || ownerUserId);
  if (!hasAny) return null;

  return (
    <div
      role="status"
      className={`rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-defaulttextcolor dark:text-white/90 ${className}`}
    >
      {name ? (
        <span>
          <span className="text-defaulttextcolor/70 dark:text-white/60">From candidate checklist — </span>
          <strong className="font-semibold text-defaulttextcolor dark:text-white">{name}</strong>
        </span>
      ) : (
        <span className="text-defaulttextcolor/80 dark:text-white/70">
          Opened from a candidate checklist. Matching student is pre-selected below when found.
        </span>
      )}
    </div>
  );
}
