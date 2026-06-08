import { apiClient } from "./client";

export type OrgUnitType = "ceo" | "manager" | "supervisor" | "department";
export interface OrgUnitNode {
  id: string;
  name: string;
  type: OrgUnitType;
  parentId: string | null;
  departmentId?: string | null;
  headEmployeeId?: string | null;
  directToCeo?: boolean;
  order?: number;
  orphaned?: boolean;
  memberCount?: number;
  employees?: { id: string; fullName: string; email?: string }[];
  children: OrgUnitNode[];
}
export interface OrgTree {
  roots: OrgUnitNode[];
  unassigned: { id: string; fullName: string }[];
}

export const getOrgTree = async (): Promise<OrgTree> => (await apiClient.get("/org-structure/tree")).data;
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
