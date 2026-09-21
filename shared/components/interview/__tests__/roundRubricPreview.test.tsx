import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { RubricTemplate } from "@/shared/lib/api/rubricTemplates";
import type { InterviewRoundPlanRow } from "@/shared/lib/api/jobs";
import * as rubricApi from "@/shared/lib/api/rubricTemplates";
import { RoundRubricPreview } from "../JobRoundPlanSection";

vi.mock("@/shared/lib/api/rubricTemplates", async (importOriginal) => {
  const actual = await importOriginal<typeof rubricApi>();
  return {
    ...actual,
    resolveRubric: vi.fn(),
    getRubricTemplate: vi.fn(),
    listRubricTemplates: vi.fn(),
  };
});

const t1: RubricTemplate = {
  id: "t1",
  name: "Other v1",
  description: "",
  criteria: [{ key: "v1", label: "Version one", weight: 100, scaleMin: 1, scaleMax: 5 }],
  appliesTo: { jobId: null, roundType: null },
  isDefault: true,
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const t2: RubricTemplate = {
  id: "t2",
  name: "Other v2",
  description: "",
  criteria: [{ key: "v2", label: "Version two", weight: 100, scaleMin: 1, scaleMax: 5 }],
  appliesTo: { jobId: null, roundType: null },
  isDefault: false,
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const selectedRow: InterviewRoundPlanRow = {
  key: "round_1",
  label: "Other",
  roundType: null,
  templateId: "t2",
  criteria: null,
};

describe("RoundRubricPreview", () => {
  beforeEach(() => {
    vi.mocked(rubricApi.resolveRubric).mockReset();
    vi.mocked(rubricApi.getRubricTemplate).mockReset();
    vi.mocked(rubricApi.resolveRubric).mockResolvedValue({
      templateId: "t1",
      templateName: "Other v1",
      criteria: t1.criteria,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the selected T2 chips and does not call resolve when T2 is in the list", async () => {
    render(<RoundRubricPreview jobId="job-1" row={selectedRow} templates={[t1, t2]} />);

    expect(await screen.findByText("Other v2")).toBeTruthy();
    expect(screen.getByText(/Version two/)).toBeTruthy();
    expect(screen.queryByText("Other v1")).toBeNull();
    expect(rubricApi.resolveRubric).not.toHaveBeenCalled();
    expect(rubricApi.getRubricTemplate).not.toHaveBeenCalled();
  });
});
