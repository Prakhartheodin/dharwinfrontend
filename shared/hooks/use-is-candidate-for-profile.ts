/** @deprecated Use `useIsEmployeeForProfile` from `./use-is-employee-for-profile`. */
import { useIsEmployeeForProfile } from "./use-is-employee-for-profile";

export function useIsCandidateForProfile(): { isCandidate: boolean; isLoading: boolean } {
  const r = useIsEmployeeForProfile();
  return { isCandidate: r.isEmployee, isLoading: r.isLoading };
}
