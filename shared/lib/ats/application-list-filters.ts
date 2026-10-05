import type { JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import { PIPELINE_STATUSES } from "@/shared/lib/ats/applicationPipeline";

const LIST_SEP = ",";

/** Accepts URLSearchParams or Next's ReadonlyURLSearchParams. */
type QueryReader = { get(key: string): string | null };

export const DEFAULT_APPLICATION_SORT = "createdAt:desc";

const VALID_SORTS = new Set([
  "createdAt:desc",
  "createdAt:asc",
  "updatedAt:desc",
  "status:asc",
]);

const VALID_STAGES = new Set<string>(PIPELINE_STATUSES);

export function parseApplicationsListPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export interface ApplicationListUrlState {
  page: number;
  q: string;
  stages: JobApplicationStatus[];
  jobId: string;
  department: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
}

export function readApplicationsFromQuery(params: QueryReader): ApplicationListUrlState {
  const stagesRaw = params.get("stages");
  const stages: JobApplicationStatus[] = stagesRaw
    ? stagesRaw
        .split(LIST_SEP)
        .map((s) => s.trim())
        .filter((s): s is JobApplicationStatus => VALID_STAGES.has(s))
    : [];

  const sortRaw = params.get("sort")?.trim() || DEFAULT_APPLICATION_SORT;
  const sortBy = VALID_SORTS.has(sortRaw) ? sortRaw : DEFAULT_APPLICATION_SORT;

  return {
    page: parseApplicationsListPage(params.get("page")),
    q: params.get("q")?.trim() || "",
    stages,
    jobId: params.get("job")?.trim() || "",
    department: params.get("dept")?.trim() || "",
    dateFrom: params.get("from")?.trim() || "",
    dateTo: params.get("to")?.trim() || "",
    sortBy,
  };
}

export function writeApplicationsToQuery(
  params: URLSearchParams,
  state: ApplicationListUrlState
): void {
  const setParam = (key: string, value: string | null) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  setParam("page", state.page > 1 ? String(state.page) : null);
  setParam("q", state.q.trim() || null);
  setParam(
    "stages",
    state.stages.length ? state.stages.join(LIST_SEP) : null
  );
  setParam("job", state.jobId.trim() || null);
  setParam("dept", state.department.trim() || null);
  setParam("from", state.dateFrom.trim() || null);
  setParam("to", state.dateTo.trim() || null);
  setParam("sort", state.sortBy !== DEFAULT_APPLICATION_SORT ? state.sortBy : null);
}
