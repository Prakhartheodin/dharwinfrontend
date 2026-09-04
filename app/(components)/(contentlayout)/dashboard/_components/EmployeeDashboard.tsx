"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { getMeWithCandidate, type CandidateWithProfile } from "@/shared/lib/api/auth";
import {
  getMyStudentForAttendance,
  getPunchInOutStatus, getPunchInOutStatusMe,
  punchInAttendance, punchInAttendanceMe,
  punchOutAttendance, punchOutAttendanceMe,
  getAttendanceStatistics, getAttendanceStatisticsMe,
  listAttendance, listAttendanceMe,
  getMyUpcomingHolidays, getEmployeesOnLeaveToday,
  type AttendanceIdentity, type PunchStatusResponse, type AttendanceStatistics, type AttendanceRecord,
  type AssignedHolidayItem, type OnLeaveTodayItem,
} from "@/shared/lib/api/attendance";
import { getMyMatchingJobs, type JobMatch } from "@/shared/lib/api/employees";
import { getAllLeaveRequests, type LeaveRequest } from "@/shared/lib/api/leave-requests";
import { listStudentCourses, type StudentCourseListItem } from "@/shared/lib/api/student-courses";
import { getTaskId, listTasks, updateTaskStatus, type Task, type TaskStatus } from "@/shared/lib/api/tasks";
import { listInternalMeetings, type InternalMeeting } from "@/shared/lib/api/internal-meetings";
import { listProjects, type Project } from "@/shared/lib/api/projects";
import { listMyTeamGroups } from "@/shared/lib/api/projectTeams";
import TodayCard from "./employee/TodayCard";
import LeaveCard from "./employee/LeaveCard";
import ProfileGapsCard from "./employee/ProfileGapsCard";
import DocumentsCard from "./employee/DocumentsCard";
import TrainingCard from "./employee/TrainingCard";
import DueTodayCard from "./employee/DueTodayCard";
import MyTasksCard from "./employee/MyTasksCard";
import MeetingsCard from "./employee/MeetingsCard";
import MyProjectsCard from "./employee/MyProjectsCard";
import TeamPulseCard from "./employee/TeamPulseCard";
import OpenRolesCard from "./employee/OpenRolesCard";
import UpcomingHolidaysCard from "./UpcomingHolidaysCard";
import BackdatedAttendanceRequestModal from "../../training/attendance/_components/BackdatedAttendanceRequestModal";
import LeaveRequestModal from "../../training/attendance/_components/LeaveRequestModal";
import TaskDetailModal from "./employee/TaskDetailModal";
import PunchInBlockedOverlay from "./employee/PunchInBlockedOverlay";
import {
  parsePunchInBlockedError,
  resolvePunchInEligibility,
  type PunchInEligibility,
} from "@/shared/lib/dashboard/employeeDashboard";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Employees with a Student profile must use the id-scoped attendance routes; the
 *  `/me` routes are reserved for agents with no Student and 403 for everyone else. */
function isUserBased(identity: AttendanceIdentity | null): boolean {
  return identity?.type === "user";
}

export default function EmployeeDashboard(): JSX.Element {
  const { user } = useAuth();

  const [identity, setIdentity] = useState<AttendanceIdentity | null>(null);
  const [identityResolved, setIdentityResolved] = useState(false);

  const [status, setStatus] = useState<PunchStatusResponse | null>(null);
  const [stats, setStats] = useState<AttendanceStatistics | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [showBackdatedModal, setShowBackdatedModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [blockedOverlay, setBlockedOverlay] = useState<Extract<PunchInEligibility, { allowed: false }> | null>(null);

  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);

  const [profile, setProfile] = useState<CandidateWithProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [courses, setCourses] = useState<StudentCourseListItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const [meetings, setMeetings] = useState<InternalMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [holidays, setHolidays] = useState<AssignedHolidayItem[]>([]);
  const [holidayMeta, setHolidayMeta] = useState<{ todayIsHoliday: boolean; todayHolidayTitle?: string | null }>({ todayIsHoliday: false });
  const [holidaysLoading, setHolidaysLoading] = useState(true);

  const [onLeave, setOnLeave] = useState<OnLeaveTodayItem[]>([]);
  const [onLeaveLoading, setOnLeaveLoading] = useState(true);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  /** Leave requests are scoped by Student id, so agents on user-based attendance have none. */
  const studentId = identity && identity.type !== "user" ? identity.id : null;

  useEffect(() => {
    let cancelled = false;
    getMyStudentForAttendance()
      .then((me) => { if (!cancelled) setIdentity(me); })
      .catch(() => { if (!cancelled) setIdentity(null); })
      .finally(() => { if (!cancelled) setIdentityResolved(true); });
    return () => { cancelled = true; };
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!identity) { setAttLoading(false); return; }
    setAttLoading(true);
    const userBased = isUserBased(identity);
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const range = { startDate: first.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
    const [s, st, rec] = await Promise.allSettled([
      userBased ? getPunchInOutStatusMe() : getPunchInOutStatus(identity.id),
      userBased ? getAttendanceStatisticsMe(range) : getAttendanceStatistics(identity.id, range),
      userBased ? listAttendanceMe({ ...range, limit: 31 }) : listAttendance(identity.id, { ...range, limit: 31 }),
    ]);
    if (s.status === "fulfilled") setStatus(s.value);
    if (st.status === "fulfilled") setStats(st.value);
    if (rec.status === "fulfilled") setRecords(rec.value.results ?? []);
    setAttLoading(false);
  }, [identity]);

  useEffect(() => { if (identityResolved) void loadAttendance(); }, [identityResolved, loadAttendance]);

  const loadLeave = useCallback(async () => {
    if (!studentId) { setLeave([]); setLeaveLoading(false); return; }
    setLeaveLoading(true);
    try {
      const page = await getAllLeaveRequests({ student: studentId, limit: 100 });
      setLeave(page.results ?? []);
    } catch {
      setLeave([]);
    } finally {
      setLeaveLoading(false);
    }
  }, [studentId]);

  useEffect(() => { if (identityResolved) void loadLeave(); }, [identityResolved, loadLeave]);

  useEffect(() => {
    if (!identityResolved) return;
    if (!studentId) { setCourses([]); setCoursesLoading(false); return; }
    let cancelled = false;
    listStudentCourses(studentId, { limit: 10 })
      .then((r) => { if (!cancelled) setCourses(r.results ?? []); })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setCoursesLoading(false); });
    return () => { cancelled = true; };
  }, [identityResolved, studentId]);

  useEffect(() => {
    let cancelled = false;
    getMeWithCandidate()
      .then((res) => { if (!cancelled) setProfile(res?.candidate ?? null); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyUpcomingHolidays({ limit: 4 })
      .then((d) => {
        if (cancelled) return;
        setHolidays(d.upcoming ?? []);
        setHolidayMeta({ todayIsHoliday: d.todayIsHoliday, todayHolidayTitle: d.todayHolidayTitle });
      })
      .catch(() => { if (!cancelled) setHolidays([]); })
      .finally(() => { if (!cancelled) setHolidaysLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getEmployeesOnLeaveToday()
      .then((r) => { if (!cancelled) setOnLeave(r.results ?? []); })
      .catch(() => { if (!cancelled) setOnLeave([]); })
      .finally(() => { if (!cancelled) setOnLeaveLoading(false); });
    getMyMatchingJobs({ limit: 5, minScore: 1 })
      .then((r) => { if (!cancelled) setJobs(r.matches ?? []); })
      .catch(() => { if (!cancelled) setJobs([]); })
      .finally(() => { if (!cancelled) setJobsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** Auth-only roster: clears teamsLoading even on error so the card never sticks on skeleton. */
  useEffect(() => {
    let cancelled = false;
    listMyTeamGroups()
      .then((r) => {
        if (cancelled) return;
        const names = (r.results ?? [])
          .map((t) => String(t.name ?? "").trim())
          .filter(Boolean);
        setTeamNames(names);
      })
      .catch(() => { if (!cancelled) setTeamNames([]); })
      .finally(() => { if (!cancelled) setTeamsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** `ProjectsListParams.mine` means *created by*, so membership is filtered client-side. */
  useEffect(() => {
    let cancelled = false;
    listProjects({ limit: 100 })
      .then((r) => {
        if (cancelled) return;
        const uid = user?.id;
        if (!uid) { setProjects([]); return; }
        setProjects((r.results ?? []).filter((p) =>
          (p.assignedTo ?? []).some((u) => u._id === uid || u.id === uid)
        ));
      })
      .catch(() => { if (!cancelled) setProjects([]); })
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    listInternalMeetings({ limit: 20, sortBy: "scheduledAt:asc", status: "scheduled" })
      .then((r) => { if (!cancelled) setMeetings(r.results ?? []); })
      .catch(() => { if (!cancelled) setMeetings([]); })
      .finally(() => { if (!cancelled) setMeetingsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const r = await listTasks({ assignedToMe: true, limit: 200 });
      setTasks(r.results ?? []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  const handleToggle = useCallback(async (id: string, next: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (getTaskId(t) === id ? { ...t, status: next } : t)));
    try {
      await updateTaskStatus(id, next);
    } catch {
      void loadTasks();
    }
  }, [loadTasks]);

  const handleOpenTask = useCallback((task: Task) => {
    setDetailTask(task);
  }, []);

  const handleCompleteFromDetail = useCallback(
    (id: string) => {
      setDetailTask(null);
      void handleToggle(id, "completed");
    },
    [handleToggle],
  );

  /** Only fields the employee can actually fill in on Settings → Personal information. */
  const gaps = useMemo(() => {
    const href = ROUTES.settingsPersonalInfo;
    const checks: Array<{ label: string; href: string; ok: boolean }> = [
      { label: "Phone number", href, ok: Boolean(profile?.phoneNumber) },
      { label: "Address", href, ok: Boolean(profile?.address?.streetAddress) },
      { label: "Qualification", href, ok: (profile?.qualifications?.length ?? 0) > 0 },
      { label: "Work experience", href, ok: (profile?.experiences?.length ?? 0) > 0 },
      { label: "Skills", href, ok: (profile?.skills?.length ?? 0) > 0 },
    ];
    return checks.filter((c) => !c.ok).map(({ label, href: to }) => ({ label, href: to }));
  }, [profile]);

  const documentGroups = useMemo(() => {
    const docs = (profile?.documents ?? [])
      .filter((d) => Boolean(d.url))
      .map((d) => ({
        name: d.label || d.originalName || d.type || "Document",
        meta: d.type ?? "",
        href: d.url as string,
      }));
    const slips = (profile?.salarySlips ?? [])
      .filter((s) => Boolean(s.documentUrl))
      .map((s) => ({
        name: [s.month, s.year].filter(Boolean).join(" ") || s.originalName || "Payslip",
        meta: s.originalName ?? "",
        href: s.documentUrl as string,
      }));
    return [
      { caption: "Uploaded documents", items: docs },
      { caption: "Payslips uploaded by HR", items: slips },
    ];
  }, [profile]);

  const weekOffDays = useMemo(() => {
    if (!identity || isUserBased(identity)) return [];
    const wo = (identity as { weekOff?: string[] }).weekOff;
    return Array.isArray(wo) ? wo : [];
  }, [identity]);

  const punchEligibility = useMemo(
    () =>
      resolvePunchInEligibility({
        todayIsHoliday: holidayMeta.todayIsHoliday,
        todayHolidayTitle: holidayMeta.todayHolidayTitle,
        leaveRequests: leave,
        attendanceRecords: records,
        weekOffDays,
      }),
    [holidayMeta.todayIsHoliday, holidayMeta.todayHolidayTitle, leave, records, weekOffDays],
  );

  const candidateTimezone = useMemo(() => {
    if (status?.shift?.timezone) return status.shift.timezone;
    if (identity && !isUserBased(identity)) {
      const shift = (identity as { shift?: { timezone?: string } }).shift;
      if (shift?.timezone) return shift.timezone;
    }
    if (typeof window !== "undefined") {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch {
        return "UTC";
      }
    }
    return "UTC";
  }, [status?.shift?.timezone, identity]);

  const handlePunch = useCallback(async () => {
    if (!identity) return;
    if (!status?.isPunchedIn && punchEligibility.allowed === false) {
      setBlockedOverlay(punchEligibility);
      return;
    }
    setPunching(true);
    const userBased = isUserBased(identity);
    try {
      if (status?.isPunchedIn) {
        if (userBased) await punchOutAttendanceMe();
        else await punchOutAttendance(identity.id);
      } else if (userBased) {
        await punchInAttendanceMe();
      } else {
        await punchInAttendance(identity.id);
      }
      await loadAttendance();
    } catch (err) {
      const blocked = parsePunchInBlockedError(err);
      if (blocked) setBlockedOverlay(blocked);
      /* otherwise keep last known state; a reload surfaces the truth */
    } finally {
      setPunching(false);
    }
  }, [identity, status?.isPunchedIn, punchEligibility, loadAttendance]);

  return (
    <Fragment>
      <Seo title="Dashboard" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[18px] px-3.5 pb-10 pt-3.5 md:px-5 md:pt-5">

        <section className="rounded-2xl border border-defaultborder/70 bg-white px-5 py-4 text-center shadow-sm shadow-black/[0.03] dark:border-white/[0.08] dark:bg-bodybg dark:shadow-none">
          <h1 className="text-[0.9375rem] font-semibold tracking-[-0.012em] text-defaulttextcolor dark:text-defaulttextcolor/90">
            {greeting()}, <span className="text-teal-600 dark:text-teal-400">{user?.name ?? "there"}</span>
          </h1>
          <p className="mt-0.5 text-[0.75rem] text-textmuted dark:text-white/50">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </section>

        <div className="grid grid-cols-1 items-stretch gap-[18px] md:grid-cols-2 xl:grid-cols-[308px_minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-[18px] [&>section:last-child]:flex-1">
            <TodayCard
              status={status}
              stats={stats}
              records={records}
              loading={attLoading}
              onPunch={handlePunch}
              punching={punching}
              punchEligibility={punchEligibility}
              onBlockedPunchClick={() => {
                if (punchEligibility.allowed === false) setBlockedOverlay(punchEligibility);
              }}
              // Past dates, not today — a blocked today must not hide the way to fix last week.
              onBackdatedEntry={identity ? () => setShowBackdatedModal(true) : undefined}
            />
            <LeaveCard
              requests={leave}
              loading={leaveLoading}
              onApplyLeave={studentId ? () => setShowLeaveModal(true) : undefined}
            />
            {profileLoading || gaps.length > 0
              ? <ProfileGapsCard gaps={gaps} totalSections={5} loading={profileLoading} />
              : null}
            <DocumentsCard groups={documentGroups} loading={profileLoading} />
          </div>

          <div className="flex min-w-0 flex-col gap-[18px] [&>section:last-child]:flex-1">
            <DueTodayCard
              tasks={tasks}
              loading={tasksLoading}
              onToggle={handleToggle}
              onOpen={handleOpenTask}
            />
            <MeetingsCard meetings={meetings} loading={meetingsLoading} />
            <MyTasksCard tasks={tasks} loading={tasksLoading} />
          </div>

          {/* [&>.box]:mb-0 cancels the legacy .box mb-6 on the reused holidays card. */}
          <div className="flex min-w-0 flex-col gap-[18px] [&>.box]:mb-0 [&>section:last-child]:flex-1">
            <UpcomingHolidaysCard
              loading={holidaysLoading}
              holidays={holidays}
              todayIsHoliday={holidayMeta.todayIsHoliday}
              todayHolidayTitle={holidayMeta.todayHolidayTitle}
              showManage={false}
            />
            {coursesLoading || courses.length > 0 ? <TrainingCard courses={courses} loading={coursesLoading} /> : null}
            <TeamPulseCard
              onLeave={onLeave}
              loading={onLeaveLoading}
              teamNames={teamNames}
              teamsLoading={teamsLoading}
            />
            <OpenRolesCard jobs={jobs} loading={jobsLoading} />
          </div>
        </div>

        <MyProjectsCard projects={projects} loading={projectsLoading} />
      </div>

      <BackdatedAttendanceRequestModal
        open={showBackdatedModal}
        onClose={() => setShowBackdatedModal(false)}
        studentId={identity?.id ?? null}
        isUserBased={identity ? isUserBased(identity) : false}
        candidateTimezone={candidateTimezone}
        weekOffDays={weekOffDays}
      />

      <LeaveRequestModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        studentId={studentId}
        weekOffDays={weekOffDays}
        onSuccess={() => void loadLeave()}
      />

      <TaskDetailModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onComplete={handleCompleteFromDetail}
      />

      <PunchInBlockedOverlay
        block={blockedOverlay}
        onClose={() => setBlockedOverlay(null)}
      />
    </Fragment>
  );
}
