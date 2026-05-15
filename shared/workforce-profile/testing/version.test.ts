import { describe, expect, it } from "vitest";
import { WORKFORCE_SCHEMA_VERSION, migrateToCurrent } from "../services/version";

describe("services/version", () => {
  it("exposes a numeric current schema version", () => {
    expect(typeof WORKFORCE_SCHEMA_VERSION).toBe("number");
    expect(WORKFORCE_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it("migrateToCurrent is identity when no migrations registered", () => {
    const data = { fullName: "X" };
    expect(migrateToCurrent(data, WORKFORCE_SCHEMA_VERSION)).toEqual(data);
  });

  it("migrateToCurrent passes data through when fromVersion >= current", () => {
    const data = { foo: 1 };
    expect(migrateToCurrent(data, WORKFORCE_SCHEMA_VERSION + 5)).toEqual(data);
  });
});
