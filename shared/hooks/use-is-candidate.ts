/** @deprecated Use `useIsEmployee` from `./use-is-employee`. */
import { useIsEmployee } from "./use-is-employee";

export function useIsCandidate(): {
  isCandidate: boolean;
  candidateId: string | null;
  isLoading: boolean;
} {
  const r = useIsEmployee();
  return { isCandidate: r.isEmployee, candidateId: r.employeeId, isLoading: r.isLoading };
}
