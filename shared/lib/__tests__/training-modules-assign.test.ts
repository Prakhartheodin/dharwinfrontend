import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/lib/api/client";
import {
  addStudentToTrainingModule,
  removeStudentFromTrainingModule,
} from "@/shared/lib/api/training-modules";

vi.mock("@/shared/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("training-modules single assignment", () => {
  const getMock = vi.mocked(apiClient.get);
  const postMock = vi.mocked(apiClient.post);
  const patchMock = vi.mocked(apiClient.patch);

  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    postMock.mockResolvedValue({ data: { enrolled: 1, skipped: 0, modules: ["m1"] } });
  });

  it("assigns with a single request and never reads the module first", async () => {
    await addStudentToTrainingModule("m1", "s1", { positionId: "p1" });

    expect(getMock).not.toHaveBeenCalled();
    expect(patchMock).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith("/positions/p1/enrollments", {
      moduleIds: ["m1"],
      action: "assign",
      studentIds: ["s1"],
    });
  });

  it("removes with a single POST and never GETs the module", async () => {
    await removeStudentFromTrainingModule("m1", "s1", { positionId: "p1" });

    expect(getMock).not.toHaveBeenCalled();
    expect(patchMock).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith("/positions/p1/enrollments", {
      moduleIds: ["m1"],
      action: "remove",
      studentIds: ["s1"],
    });
  });
});
