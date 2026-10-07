/**

 * Attendance settings access rules, shared so the nav link and the pages behind it

 * cannot drift apart.

 *

 * `attendance.assign` on the backend resolves to `students.manage` OR `attendance.manage`.

 * Auth context holds raw matrix strings; backend derives API keys — expand before checking.

 */



import { expandPermissionsWithDerivedApi } from "@/shared/lib/derive-api-permissions";



function hasApiKey(permissions: Set<string>, key: string): boolean {

  return permissions.has(key) || [...permissions].some((p) => p.startsWith(key));

}



/** attendance.assign = students.manage OR attendance.manage — agent-visible attendance screens. */

export function hasAttendanceAssign(permissions: string[], isAdministrator: boolean): boolean {

  if (isAdministrator) return true;

  const effective = expandPermissionsWithDerivedApi(permissions);

  return hasApiKey(effective, "students.manage") || hasApiKey(effective, "attendance.manage");

}



/** students.manage — system-level attendance config (holidays list, employee groups, manage shifts). */

export function hasStudentsManage(permissions: string[], isAdministrator: boolean): boolean {

  if (isAdministrator) return true;

  const effective = expandPermissionsWithDerivedApi(permissions);

  return hasApiKey(effective, "students.manage");

}



/** students.read (or manage) — list shifts and other read-only attendance admin data. */

export function hasStudentsRead(permissions: string[], isAdministrator: boolean): boolean {

  if (isAdministrator) return true;

  if (hasStudentsManage(permissions, isAdministrator)) return true;

  const effective = expandPermissionsWithDerivedApi(permissions);

  return hasApiKey(effective, "students.read");

}



/** candidates.read (or manage) — list/search employee profiles for assign-shift. */

export function hasCandidatesRead(permissions: string[], isAdministrator: boolean): boolean {

  if (isAdministrator) return true;

  const effective = expandPermissionsWithDerivedApi(permissions);

  if (hasApiKey(effective, "candidates.manage")) return true;

  return hasApiKey(effective, "candidates.read");

}



/** employees.read (or edit/manage) — GET /employees list backstop alongside candidates.read. */

export function hasEmployeesRead(permissions: string[], isAdministrator: boolean): boolean {

  if (isAdministrator) return true;

  const effective = expandPermissionsWithDerivedApi(permissions);

  if (hasApiKey(effective, "employees.edit") || hasApiKey(effective, "employees.manage")) return true;

  return hasApiKey(effective, "employees.read");

}



/** Matches backend `canReadEmployees` on GET /v1/employees (candidates.read OR employees.read). */

export function hasEmployeeOrCandidateListRead(permissions: string[], isAdministrator: boolean): boolean {

  return hasCandidatesRead(permissions, isAdministrator) || hasEmployeesRead(permissions, isAdministrator);

}



/**

 * POST /v1/employees/assign-shift — `candidates.manage` OR `employees.edit` (same as canEditEmployees).

 * Platform super user bypass only (matches requireAnyOfPermissions on the route).

 */

export function hasAssignShiftEmployeeMutate(

  permissions: string[],

  _isAdministrator: boolean,

  isPlatformSuperUser: boolean

): boolean {

  if (isPlatformSuperUser) return true;

  const effective = expandPermissionsWithDerivedApi(permissions);

  return hasApiKey(effective, "employees.edit") || hasApiKey(effective, "candidates.manage");

}



export type AssignShiftPeopleSearchGates = {

  canReadStudents: boolean;

  canReadEmployees: boolean;

  canMutateStudents: boolean;

  canMutateCandidates: boolean;

  canSearchStudents: boolean;

  canSearchCandidates: boolean;

};



/** Read + mutate parity for assign-shift people search (no API calls when false). */

export function resolveAssignShiftPeopleSearchGates(

  permissions: string[],

  isAdministrator: boolean,

  isPlatformSuperUser: boolean

): AssignShiftPeopleSearchGates {

  const canMutateStudents = isPlatformSuperUser || hasAttendanceAssign(permissions, isAdministrator);

  const canMutateCandidates = hasAssignShiftEmployeeMutate(permissions, isAdministrator, isPlatformSuperUser);

  const canReadStudents = isPlatformSuperUser || hasStudentsRead(permissions, isAdministrator);

  const canReadEmployees = isPlatformSuperUser || hasEmployeeOrCandidateListRead(permissions, isAdministrator);

  return {

    canReadStudents,

    canReadEmployees,

    canMutateStudents,

    canMutateCandidates,

    canSearchStudents: canReadStudents && canMutateStudents,

    canSearchCandidates: canReadEmployees && canMutateCandidates,

  };

}



export type AssignShiftPageGates = AssignShiftPeopleSearchGates & {

  /** Page shell — matches backend `attendance.assign` (GET /shifts/:id/assignees). */

  canAccess: boolean;

  /** GET /v1/shifts — backend `students.read`. */

  canReadShifts: boolean;

  /** When false, do not call shift list/read endpoints (avoids 403). */

  canLoadShifts: boolean;

};



export const ASSIGN_SHIFT_SHIFTS_READ_MESSAGE =

  "You can assign and review who is on a shift, but loading the shift list requires students.read (training student view). Ask an admin for view access.";



/** Assign-shift page: access, shift list read, and people-search gates in one place. */

export function resolveAssignShiftPageGates(

  permissions: string[],

  isAdministrator: boolean,

  isPlatformSuperUser: boolean

): AssignShiftPageGates {

  const people = resolveAssignShiftPeopleSearchGates(permissions, isAdministrator, isPlatformSuperUser);

  const canAccess = isPlatformSuperUser || hasAttendanceAssign(permissions, isAdministrator);

  const canReadShifts = isPlatformSuperUser || hasStudentsRead(permissions, isAdministrator);

  return {

    ...people,

    canAccess,

    canReadShifts,

    canLoadShifts: canReadShifts,

  };

}


