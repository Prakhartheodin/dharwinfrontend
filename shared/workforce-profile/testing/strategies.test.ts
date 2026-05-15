import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSubmitStrategy } from "../submit/strategies";
import { makeFormState } from "./fixtures";

vi.mock("@/shared/lib/api/employees", () => ({
  createCandidate: vi.fn(async (payload) => ({ _id: "new", ...payload })),
  updateCandidate: vi.fn(async (id, payload) => ({ _id: id, ...payload })),
}));

vi.mock("@/shared/lib/api/auth", () => ({
  updateMeWithCandidate: vi.fn(async (payload) => ({
    user: { _id: "u" },
    candidate: { _id: "c", ...payload },
  })),
}));

describe("getSubmitStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns create-admin for create-admin mode", async () => {
    const strategy = getSubmitStrategy({ mode: "create-admin", role: "admin" });
    expect(strategy.kind).toBe("create-admin");
    const result = await strategy.run({ state: makeFormState() });
    expect(result.kind).toBe("create-admin");
  });

  it("throws when edit-admin missing id", () => {
    expect(() =>
      getSubmitStrategy({ mode: "edit-admin", role: "admin" }),
    ).toThrow(/requires a candidate id/);
  });

  it("returns update-admin for edit-admin with id", async () => {
    const strategy = getSubmitStrategy({
      mode: "edit-admin",
      role: "admin",
      id: "abc",
    });
    expect(strategy.kind).toBe("update-admin");
    const result = await strategy.run({ state: makeFormState() });
    expect(result.kind).toBe("update-admin");
  });

  it("returns self-service for self-service-employee", async () => {
    const strategy = getSubmitStrategy({
      mode: "self-service-employee",
      role: "employee",
    });
    expect(strategy.kind).toBe("self-service");
    const result = await strategy.run({
      state: makeFormState(),
      dirty: { "personal-info": true },
    });
    expect(result.kind).toBe("self-service");
  });

  it("returns self-service for self-service-candidate", () => {
    const strategy = getSubmitStrategy({
      mode: "self-service-candidate",
      role: "candidate",
    });
    expect(strategy.kind).toBe("self-service");
  });
});
