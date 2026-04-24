/** @deprecated Use `useHasEmployeeRole` from `./use-has-employee-role`. */
import { useHasEmployeeRole } from "./use-has-employee-role";

export function useHasCandidateRole(): {
  hasCandidateRole: boolean;
  hasCandidateProfile: boolean;
  isLoading: boolean;
} {
  const r = useHasEmployeeRole();
  return {
    hasCandidateRole: r.hasEmployeeRole,
    hasCandidateProfile: r.hasEmployeeProfile,
    isLoading: r.isLoading,
  };
}
