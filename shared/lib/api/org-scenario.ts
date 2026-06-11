import { apiClient } from "./client";
import type { OrgTree, Paginated } from "./org-structure";

export type OrgScenarioStatus = "draft" | "approved" | "applied" | "archived";

export interface OrgScenario {
  id: string;
  _id?: string;
  name: string;
  status: OrgScenarioStatus;
  clonedAt?: string | null;
  appliedAt?: string | null;
  scenarioApplyId?: string | null;
  notes?: string;
}

export interface OrgScenarioDiff {
  scenarioId: string;
  changeCount: number;
  /** Reparent changes that "Apply to live" will actually commit (vs total changeCount). */
  applicableCount?: number;
  changes: Array<Record<string, unknown>>;
}

export const listOrgScenarios = async (params?: {
  page?: number;
  limit?: number;
  status?: OrgScenarioStatus;
}): Promise<Paginated<OrgScenario>> => (await apiClient.get("/org-scenarios", { params })).data;

export const createOrgScenario = async (body: { name: string; notes?: string }): Promise<OrgScenario> =>
  (await apiClient.post("/org-scenarios", body)).data;

export const cloneOrgScenario = async (id: string) => (await apiClient.post(`/org-scenarios/${id}/clone`)).data;

export const getOrgScenarioTree = async (id: string): Promise<OrgTree> =>
  (await apiClient.get(`/org-scenarios/${id}/tree`)).data;

export const diffOrgScenario = async (id: string): Promise<OrgScenarioDiff> =>
  (await apiClient.get(`/org-scenarios/${id}/diff`)).data;

export const reparentScenarioUnit = async (
  scenarioId: string,
  scenarioUnitId: string,
  parentScenarioUnitId: string | null
) =>
  (
    await apiClient.patch(`/org-scenarios/${scenarioId}/units/${scenarioUnitId}/reparent`, {
      parentScenarioUnitId,
    })
  ).data;

export const approveOrgScenario = async (id: string) => (await apiClient.patch(`/org-scenarios/${id}/approve`)).data;

export const applyOrgScenario = async (id: string) => (await apiClient.post(`/org-scenarios/${id}/apply`)).data;

export const deleteOrgScenario = async (id: string) => (await apiClient.delete(`/org-scenarios/${id}`)).data;
