import { describe, expect, it } from "vitest";
import { canAccessPath } from "../route-permissions";

/**
 * Regression: Offers/Placement, Pre-boarding and Onboarding pages must be gated by
 * their own `view` action, not by any CRUD action on the prefix.
 * Before the fix these paths had no PATH_ACCESS_ACTIONS rule, so the fallback
 * prefix-match granted nav + route access for create/edit/delete alone.
 */
describe("ATS view-gated pages (offers/pre-boarding/onboarding)", () => {
  const cases: { path: string; prefix: string }[] = [
    { path: "/ats/offers-placement", prefix: "ats.offers:" },
    { path: "/ats/pre-boarding", prefix: "ats.pre-boarding:" },
    { path: "/ats/onboarding", prefix: "ats.onboarding:" },
  ];

  for (const { path, prefix } of cases) {
    it(`${path} requires ${prefix}view`, () => {
      // view grants access
      expect(canAccessPath([`${prefix}view`], path)).toBe(true);
      expect(canAccessPath([`${prefix}view,create,edit,delete`], path)).toBe(true);

      // any single non-view action must NOT grant visibility
      expect(canAccessPath([`${prefix}create`], path)).toBe(false);
      expect(canAccessPath([`${prefix}edit`], path)).toBe(false);
      expect(canAccessPath([`${prefix}delete`], path)).toBe(false);
      expect(canAccessPath([`${prefix}create,edit,delete`], path)).toBe(false);

      // unrelated permission must NOT grant visibility
      expect(canAccessPath(["ats.jobs:view"], path)).toBe(false);
    });
  }
});
