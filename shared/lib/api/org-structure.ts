import { apiClient } from "./client";

export type OrgUnitType = "ceo" | "manager" | "supervisor" | "department";
export interface OrgHeadEmployee {
  id: string;
  fullName: string;
  email?: string;
  designation?: string;
  departmentId?: string | null;
}
export type SpanBand = "ok" | "warn" | "critical";

export interface OrgUnitNode {
  id: string;
  name: string;
  type: OrgUnitType;
  parentId: string | null;
  departmentId?: string | null;
  /** Department-node colour (hex). Empty/undefined = chart auto-assigns a distinct colour. */
  color?: string;
  headEmployeeId?: string | null;
  headEmployee?: OrgHeadEmployee | null;
  directToCeo?: boolean;
  order?: number;
  isActive?: boolean;
  orphaned?: boolean;
  memberCount?: number;
  spanDirect?: number;
  spanIndirect?: number;
  spanBand?: SpanBand;
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
  overSpanUnits?: number;
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

export interface Paginated<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface OrgChartSearchResult {
  units: { id: string; name: string; type: OrgUnitType }[];
  employees: { id: string; fullName: string; departmentId?: string | null }[];
  paths: { kind: "unit" | "employee"; id: string; unitId?: string; pathIds: string[] }[];
}

export const getOrgTree = async (): Promise<OrgTree> => (await apiClient.get("/org-structure/tree")).data;
export const getOrgTreeLazy = async (rootId?: string | null, depth?: number): Promise<OrgTree> =>
  (
    await apiClient.get("/org-structure/tree", {
      params: { ...(rootId != null ? { rootId } : {}), ...(depth != null ? { depth } : {}) },
    })
  ).data;
export const searchOrgChart = async (q: string): Promise<OrgChartSearchResult> =>
  (await apiClient.get("/org-structure/search", { params: { q } })).data;
export const getOrgCoverage = async (): Promise<OrgCoverageSummary> =>
  (await apiClient.get("/org-structure/coverage")).data;
export const listAssignableHeads = async (departmentId?: string | null): Promise<{ id: string; name: string }[]> =>
  (await apiClient.get("/org-structure/employees", { params: departmentId ? { departmentId } : {} })).data;
export async function exportOrgComplianceReport(format?: "json"): Promise<OrgComplianceReport>;
export async function exportOrgComplianceReport(format: "csv"): Promise<Blob>;
export async function exportOrgComplianceReport(
  format: "json" | "csv" = "json"
): Promise<OrgComplianceReport | Blob> {
  if (format === "csv") {
    const { data } = await apiClient.get<Blob>("/org-structure/export", {
      params: { format: "csv" },
      responseType: "blob",
    });
    return data;
  }
  return (await apiClient.get<OrgComplianceReport>("/org-structure/export")).data;
}
export const listOrgUnits = async (): Promise<OrgUnitNode[]> => (await apiClient.get("/org-structure")).data;
export const listOrgUnitsPaged = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  includeInactive?: boolean;
}): Promise<Paginated<OrgUnitNode>> => (await apiClient.get("/org-structure", { params })).data;
export const createOrgUnit = async (body: Partial<OrgUnitNode>): Promise<OrgUnitNode> =>
  (await apiClient.post("/org-structure", body)).data;
export const updateOrgUnit = async (id: string, body: Partial<OrgUnitNode>) =>
  (await apiClient.patch(`/org-structure/${id}`, body)).data;
export const reparentOrgUnit = async (id: string, parentId: string | null) =>
  (await apiClient.patch(`/org-structure/${id}/reparent`, { parentId })).data;
/** Live chart drag-drop reparent with audit (Phase 3). */
export const reparentOrgUnitFromChart = async (id: string, parentId: string | null) =>
  (await apiClient.patch(`/org-structure/${id}/chart-reparent`, { parentId })).data;
export const queryEmployeeDirectory = async (params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<{ id: string; fullName: string; email: string; designation: string; departmentName: string }>> =>
  (await apiClient.get("/org-structure/directory", { params })).data;
export const assignHead = async (id: string, headEmployeeId: string | null) =>
  (await apiClient.patch(`/org-structure/${id}/head`, { headEmployeeId })).data;
export const deactivateOrgUnit = async (id: string) => (await apiClient.delete(`/org-structure/${id}`)).data;
export const reactivateOrgUnit = async (id: string) => (await apiClient.patch(`/org-structure/${id}/reactivate`)).data;
export const deleteOrgUnit = async (id: string) => (await apiClient.delete(`/org-structure/${id}/permanent`)).data;
