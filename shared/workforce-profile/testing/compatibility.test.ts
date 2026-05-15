import { describe, expect, it } from "vitest";
import {
  applyBackendAliases,
  applyUiAliases,
} from "../services/compatibility";

describe("services/compatibility", () => {
  it("aliases backend `qualifications` to ui `educations`", () => {
    const out = applyBackendAliases({ qualifications: [{ degree: "X" }] });
    expect(out.educations).toEqual([{ degree: "X" }]);
    expect(out.qualifications).toEqual([{ degree: "X" }]);
  });

  it("preserves existing ui field when backend alias present", () => {
    const out = applyBackendAliases({
      qualifications: [{ degree: "X" }],
      educations: [{ degree: "Y" }],
    });
    expect(out.educations).toEqual([{ degree: "Y" }]);
  });

  it("aliases ui `educations` to backend `qualifications`", () => {
    const out = applyUiAliases({ educations: [{ degree: "Z" }] });
    expect(out.qualifications).toEqual([{ degree: "Z" }]);
  });
});
