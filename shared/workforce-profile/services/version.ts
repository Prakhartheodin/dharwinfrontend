export const WORKFORCE_SCHEMA_VERSION = 1;

type Migration = (data: unknown) => unknown;

export const migrations: Record<number, Migration> = {
  // Add forward migrations as schema evolves, e.g.:
  // 1: (data) => transformV1toV2(data),
};

export function migrateToCurrent(
  data: unknown,
  fromVersion: number,
): unknown {
  let current = data;
  for (let v = fromVersion; v < WORKFORCE_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) current = migrate(current);
  }
  return current;
}
