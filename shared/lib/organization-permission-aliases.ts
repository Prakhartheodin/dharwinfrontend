/**
 * Cross-grants for Organization module — mirrors backend requireAnyOfPermissions on org routes.
 * Structure (and chart for directory) can read sibling surfaces; write stays on the feature row.
 */
export const ORGANIZATION_FEATURE_PREFIX_ALIASES: Record<string, string[]> = {
  "organization.chart": ["organization.structure"],
  "organization.departments": ["organization.structure"],
  "organization.directory": ["organization.chart", "organization.structure"],
  // Scenarios is gated by its own organization.scenarios permission only — NOT cross-granted
  // from structure (mirrors backend orgScenario.route.js, which requires scenarios.* only).
};

/** Create/edit/delete inherited from structure (backend: departments.manage ∨ structure.manage). */
export const ORGANIZATION_FEATURE_WRITE_INHERIT: Record<string, string[]> = {
  "organization.departments": ["organization.structure"],
};

/** Same map with trailing colons for route-permissions prefix checks. */
export const ORGANIZATION_ROUTE_PREFIX_ALIASES: Record<string, string[]> = Object.fromEntries(
  Object.entries(ORGANIZATION_FEATURE_PREFIX_ALIASES).map(([key, aliases]) => [
    `${key}:`,
    aliases.map((a) => `${a}:`),
  ])
);
