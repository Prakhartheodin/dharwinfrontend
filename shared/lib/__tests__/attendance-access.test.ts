import { describe, it, expect } from "vitest";
import {
  hasAssignShiftEmployeeMutate,
  hasAttendanceAssign,
  hasCandidatesRead,
  hasEmployeesRead,
  hasEmployeeOrCandidateListRead,
  hasStudentsManage,
  hasStudentsRead,
  resolveAssignShiftPeopleSearchGates,
  resolveAssignShiftPageGates,
} from "@/shared/lib/attendance-access";

describe("hasAttendanceAssign", () => {
  it("grants attendance.manage without students.manage", () => {
    expect(hasAttendanceAssign(["attendance.manage"], false)).toBe(true);
  });

  it("grants students.manage", () => {
    expect(hasAttendanceAssign(["students.manage"], false)).toBe(true);
  });

  it("denies students.read only", () => {
    expect(hasAttendanceAssign(["students.read"], false)).toBe(false);
  });

  it("denies view-only attendance matrix strings", () => {
    expect(hasAttendanceAssign(["settings.attendance:view"], false)).toBe(false);
    expect(hasAttendanceAssign(["training.attendance:view"], false)).toBe(false);
  });

  it("grants training attendance view+create+edit via derived attendance.manage", () => {
    expect(hasAttendanceAssign(["training.attendance:view,create,edit"], false)).toBe(true);
  });

  it("grants settings attendance write via derived attendance.manage", () => {
    expect(hasAttendanceAssign(["settings.attendance:view,create,edit"], false)).toBe(true);
  });
});

describe("hasStudentsManage", () => {
  it("does not grant attendance.manage alone", () => {
    expect(hasStudentsManage(["attendance.manage"], false)).toBe(false);
  });

  it("does not grant training attendance manage matrix alone", () => {
    expect(hasStudentsManage(["training.attendance:view,create,edit"], false)).toBe(false);
  });

  it("grants training.students write via derived students.manage", () => {
    expect(hasStudentsManage(["training.students:view,create,edit"], false)).toBe(true);
  });

  it("is the gate for training track-all (not attendance.manage)", () => {
    expect(hasStudentsManage(["students.manage"], false)).toBe(true);
    expect(hasAttendanceAssign(["attendance.manage"], false)).toBe(true);
    expect(hasStudentsManage(["attendance.manage"], false)).toBe(false);
  });
});

describe("hasStudentsRead", () => {
  it("grants training.students view via derived students.read", () => {
    expect(hasStudentsRead(["training.students:view"], false)).toBe(true);
  });
});

describe("hasCandidatesRead", () => {
  it("grants ats candidates view via derived candidates.read", () => {
    expect(hasCandidatesRead(["ats.candidates:view"], false)).toBe(true);
  });

  it("grants candidates.manage", () => {
    expect(hasCandidatesRead(["candidates.manage"], false)).toBe(true);
  });
});

describe("hasEmployeesRead", () => {
  it("grants ats employees view via derived employees.read", () => {
    expect(hasEmployeesRead(["ats.employees:view"], false)).toBe(true);
  });

  it("grants employees.edit without employees.read", () => {
    expect(hasEmployeesRead(["ats.employees:view,edit"], false)).toBe(true);
  });
});

describe("hasEmployeeOrCandidateListRead", () => {
  it("grants employees.read or candidates.read", () => {
    expect(hasEmployeeOrCandidateListRead(["ats.employees:view"], false)).toBe(true);
    expect(hasEmployeeOrCandidateListRead(["ats.candidates:view"], false)).toBe(true);
    expect(hasEmployeeOrCandidateListRead(["training.students:view"], false)).toBe(false);
  });
});

describe("resolveAssignShiftPeopleSearchGates", () => {
  it("allows student search only with read and attendance.assign mutate", () => {
    const gates = resolveAssignShiftPeopleSearchGates(["attendance.manage"], false, false);
    expect(gates.canMutateStudents).toBe(true);
    expect(gates.canReadStudents).toBe(false);
    expect(gates.canSearchStudents).toBe(false);
    expect(gates.canSearchCandidates).toBe(false);
  });

  it("allows student search when training view and assign align", () => {
    const gates = resolveAssignShiftPeopleSearchGates(
      ["training.students:view", "training.attendance:view,create,edit"],
      false,
      false
    );
    expect(gates.canSearchStudents).toBe(true);
    expect(gates.canSearchCandidates).toBe(false);
  });

  it("allows employee search when assign mutate and list read align", () => {
    const gates = resolveAssignShiftPeopleSearchGates(["candidates.manage"], false, false);
    expect(gates.canMutateCandidates).toBe(true);
    expect(gates.canReadEmployees).toBe(true);
    expect(gates.canSearchCandidates).toBe(true);
  });

  it("blocks employee search when assign-shift mutate missing", () => {
    const gates = resolveAssignShiftPeopleSearchGates(["ats.employees:view"], false, false);
    expect(gates.canReadEmployees).toBe(true);
    expect(gates.canMutateCandidates).toBe(false);
    expect(gates.canSearchCandidates).toBe(false);
  });

  it("does not grant employee search for employees.edit alone without list read parity", () => {
    const gates = resolveAssignShiftPeopleSearchGates(["ats.employees:view,edit"], false, false);
    expect(gates.canMutateCandidates).toBe(true);
    expect(gates.canSearchCandidates).toBe(true);
  });
});

describe("resolveAssignShiftPageGates", () => {
  it("allows page access with attendance.assign but blocks shift list without students.read", () => {
    const gates = resolveAssignShiftPageGates(["attendance.manage"], false, false);
    expect(gates.canAccess).toBe(true);
    expect(gates.canReadShifts).toBe(false);
    expect(gates.canLoadShifts).toBe(false);
    expect(gates.canMutateStudents).toBe(true);
    expect(gates.canSearchStudents).toBe(false);
  });

  it("loads shifts when training student view and assign align", () => {
    const gates = resolveAssignShiftPageGates(
      ["training.students:view", "training.attendance:view,create,edit"],
      false,
      false
    );
    expect(gates.canAccess).toBe(true);
    expect(gates.canLoadShifts).toBe(true);
    expect(gates.canSearchStudents).toBe(true);
  });

  it("denies page without attendance.assign even with students.read", () => {
    const gates = resolveAssignShiftPageGates(["training.students:view"], false, false);
    expect(gates.canAccess).toBe(false);
    expect(gates.canReadShifts).toBe(true);
    expect(gates.canLoadShifts).toBe(true);
  });

  it("grants platform super user all gates", () => {
    const gates = resolveAssignShiftPageGates([], false, true);
    expect(gates.canAccess).toBe(true);
    expect(gates.canLoadShifts).toBe(true);
    expect(gates.canSearchStudents).toBe(true);
    expect(gates.canSearchCandidates).toBe(true);
  });
});

describe("hasAssignShiftEmployeeMutate", () => {
  it("denies administrator without candidates.manage or employees.edit", () => {
    expect(hasAssignShiftEmployeeMutate([], true, false)).toBe(false);
  });

  it("grants platform super user", () => {
    expect(hasAssignShiftEmployeeMutate([], false, true)).toBe(true);
  });

  it("denies attendance.assign only (training profiles use a different API)", () => {
    expect(hasAssignShiftEmployeeMutate(["attendance.manage"], false, false)).toBe(false);
    expect(hasAssignShiftEmployeeMutate(["training.attendance:view,create,edit"], false, false)).toBe(false);
  });

  it("denies employees.manage without employees.edit", () => {
    expect(hasAssignShiftEmployeeMutate(["employees.manage"], false, false)).toBe(false);
  });

  it("grants candidates.manage and employees.edit", () => {
    expect(hasAssignShiftEmployeeMutate(["candidates.manage"], false, false)).toBe(true);
    expect(hasAssignShiftEmployeeMutate(["ats.employees:view,edit"], false, false)).toBe(true);
  });
});
