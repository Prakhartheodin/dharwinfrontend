import { apiClient } from "./client";

export type OrgUnitType = "ceo" | "manager" | "supervisor" | "department";
export interface OrgHeadEmployee {
  id: string;
  fullName: string;
  email?: string;
  designation?: string;
  departmentId?: string | null;
}
export interface OrgUnitNode {
  id: string;
  name: string;
  type: OrgUnitType;
  parentId: string | null;
  departmentId?: string | null;
  headEmployeeId?: string | null;
  headEmployee?: OrgHeadEmployee | null;
  directToCeo?: boolean;
  order?: number;
  orphaned?: boolean;
  memberCount?: number;
  employees?: { id: string; fullName: string; email?: string }[];
  children: OrgUnitNode[];
}
export interface OrgTree {
  roots: OrgUnitNode[];
  unassigned: { id: string; fullName: string; email?: string }[];
}
export interface OrgCoverageSummary {
  totalActiveEmployees: number;
  assignedEmployees: number;
  unassignedEmployees: number;
  totalOrgUnits: number;
  departmentsWithoutNode: number;
  departmentNodesWithoutEmployees: number;
  unitsMissingHead: number;
  hasCeo: boolean;
  checklist: {
    hasCeo: boolean;
    hasManagers: boolean;
    hasSupervisors: boolean;
    hasDepartmentNodes: boolean;
    allDepartmentsLinked: boolean;
    noUnassignedEmployees: boolean;
    allLeadershipHeadsAssigned: boolean;
  };
}
export interface OrgComplianceReport {
  generatedAt: string;
  summary: OrgCoverageSummary;
  hierarchy: {
    unitId: string;
    unitName: string;
    unitType: OrgUnitType;
    hierarchyPath: string;
    memberCount: number;
    headName: string;
    employees: string;
  }[];
  unassigned: { id: string; fullName: string; email: string }[];
}

export const getOrgTree = async (): Promise<OrgTree> => (await apiClient.get("/org-structure/tree")).data;
export const getOrgCoverage = async (): Promise<OrgCoverageSummary> =>
  (await apiClient.get("/org-structure/coverage")).data;
export const exportOrgComplianceReport = async (): Promise<OrgComplianceReport> =>
  (await apiClient.get("/org-structure/export")).data;
export const listOrgUnits = async (): Promise<OrgUnitNode[]> => (await apiClient.get("/org-structure")).data;
export const createOrgUnit = async (body: Partial<OrgUnitNode>): Promise<OrgUnitNode> =>
  (await apiClient.post("/org-structure", body)).data;
export const updateOrgUnit = async (id: string, body: Partial<OrgUnitNode>) =>
  (await apiClient.patch(`/org-structure/${id}`, body)).data;
export const reparentOrgUnit = async (id: string, parentId: string | null) =>
  (await apiClient.patch(`/org-structure/${id}/reparent`, { parentId })).data;
export const assignHead = async (id: string, headEmployeeId: string | null) =>
  (await apiClient.patch(`/org-structure/${id}/head`, { headEmployeeId })).data;
export const deactivateOrgUnit = async (id: string) => (await apiClient.delete(`/org-structure/${id}`)).data;
