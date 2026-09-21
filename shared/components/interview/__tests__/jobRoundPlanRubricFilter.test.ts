import { describe, expect, it } from "vitest";
import { rubricOfferableForRow, rubricPreviewFromLoadedTemplates } from "../JobRoundPlanSection";
import type { RubricTemplate } from "@/shared/lib/api/rubricTemplates";
import type { InterviewRoundPlanRow } from "@/shared/lib/api/jobs";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";

/**
 * The Screening round used to list the Technical rubric and vice versa: the option list
 * filtered on archivedAt only and ignored "Applies to round type" entirely. Picking the
 * wrong one is silent — the round just gets scored against the wrong criteria.
 */

const template = (
  id: string,
  roundType: InterviewRoundType | null,
  archivedAt: string | null = null
): RubricTemplate => ({
  id,
  name: `${roundType ?? "generic"} rubric`,
  description: "",
  criteria: [],
  appliesTo: { jobId: null, roundType },
  isDefault: false,
  archivedAt,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

const row = (
  roundType: InterviewRoundType | null,
  templateId: string | null = null
): InterviewRoundPlanRow =>
  ({
    key: "round_1",
    label: "Round 1",
    roundType,
    templateId,
    criteria: null,
  }) as InterviewRoundPlanRow;

describe("rubricOfferableForRow", () => {
  it("offers a rubric only to the round type it declares", () => {
    const screening = template("t-screening", "screening");
    expect(rubricOfferableForRow(screening, row("screening"))).toBe(true);
    expect(rubricOfferableForRow(screening, row("technical"))).toBe(false);
  });

  it("offers a rubric with no round type to every round", () => {
    const generic = template("t-generic", null);
    for (const type of ["screening", "technical", "final"] as InterviewRoundType[]) {
      expect(rubricOfferableForRow(generic, row(type))).toBe(true);
    }
  });

  it("offers everything to a round whose type is not chosen yet", () => {
    // Nothing to filter against, and hiding rubrics here would look like they do not exist.
    expect(rubricOfferableForRow(template("t-screening", "screening"), row(null))).toBe(true);
    expect(rubricOfferableForRow(template("t-technical", "technical"), row(null))).toBe(true);
  });

  it("does not list other Screening templates on a Technical row that already holds one", () => {
    const saved = template("t-screening", "screening");
    const otherScreening = template("t-screening-2", "screening");
    const generic = template("t-generic", null);
    const technical = template("t-technical", "technical");
    const techRow = row("technical", "t-screening");
    expect(rubricOfferableForRow(saved, techRow)).toBe(true);
    expect(rubricOfferableForRow(otherScreening, techRow)).toBe(false);
    expect(rubricOfferableForRow(generic, techRow)).toBe(true);
    expect(rubricOfferableForRow(technical, techRow)).toBe(true);
  });

  it("keeps an archived rubric only while it is the selected one", () => {
    const archived = template("t-old", "screening", "2026-09-10T00:00:00.000Z");
    expect(rubricOfferableForRow(archived, row("screening"))).toBe(false);
    expect(rubricOfferableForRow(archived, row("screening", "t-old"))).toBe(true);
  });
});

describe("rubricPreviewFromLoadedTemplates", () => {
  it("previews the selected Other template, not another Other template in the catalog", () => {
    const t1: RubricTemplate = {
      ...template("t1", null),
      name: "Other v1",
      criteria: [{ key: "v1", label: "Version one", weight: 100, scaleMin: 1, scaleMax: 5 }],
    };
    const t2: RubricTemplate = {
      ...template("t2", null),
      name: "Other v2",
      criteria: [{ key: "v2", label: "Version two", weight: 100, scaleMin: 1, scaleMax: 5 }],
    };
    const preview = rubricPreviewFromLoadedTemplates(row(null, "t2"), [t1, t2]);
    expect(preview).toEqual({
      source: "template",
      templateId: "t2",
      templateName: "Other v2",
      criteria: t2.criteria,
    });
  });

  it("keeps custom-criteria preview local", () => {
    const customRow = {
      ...row(null, null),
      criteria: [{ key: "local", label: "Local", weight: 100, scaleMin: 1, scaleMax: 5 }],
    } as InterviewRoundPlanRow;
    const preview = rubricPreviewFromLoadedTemplates(customRow, [template("t1", null)]);
    expect(preview.source).toBe("custom");
    if (preview.source === "custom") {
      expect(preview.templateName).toBe("Custom for this round");
      expect(preview.criteria[0].key).toBe("local");
    }
  });

  it("reports missing when the selected template is not in the loaded list", () => {
    const preview = rubricPreviewFromLoadedTemplates(row(null, "t-missing"), [template("t1", null)]);
    expect(preview).toEqual({ source: "missing", templateId: "t-missing" });
  });

  it("keeps T1 and T2 distinct on two Other rows", () => {
    const t1: RubricTemplate = {
      ...template("t1", null),
      name: "Other v1",
      criteria: [{ key: "v1", label: "Version one", weight: 100, scaleMin: 1, scaleMax: 5 }],
    };
    const t2: RubricTemplate = {
      ...template("t2", null),
      name: "Other v2",
      criteria: [{ key: "v2", label: "Version two", weight: 100, scaleMin: 1, scaleMax: 5 }],
    };
    const a = rubricPreviewFromLoadedTemplates(row("other", "t1"), [t1, t2]);
    const b = rubricPreviewFromLoadedTemplates(
      { ...row("other", "t2"), key: "round_2", label: "Round 2" },
      [t1, t2]
    );
    expect(a.source === "template" && a.templateName).toBe("Other v1");
    expect(b.source === "template" && b.templateName).toBe("Other v2");
  });
});

describe("rubricOfferableForRow screening catalog", () => {
  it("lists a generic rubric and a screening rubric for a Screening row", () => {
    const generic = template("t-generic", null);
    const screening = template("t-screening", "screening");
    const technical = template("t-technical", "technical");
    const screeningRow = row("screening");
    expect(rubricOfferableForRow(generic, screeningRow)).toBe(true);
    expect(rubricOfferableForRow(screening, screeningRow)).toBe(true);
    expect(rubricOfferableForRow(technical, screeningRow)).toBe(false);
  });

  it("lists only Technical and any-round templates on a Technical row", () => {
    const generic = template("t-generic", null);
    const screening = template("t-screening", "screening");
    const technical = template("t-technical", "technical");
    const technicalRow = row("technical");
    expect(rubricOfferableForRow(generic, technicalRow)).toBe(true);
    expect(rubricOfferableForRow(technical, technicalRow)).toBe(true);
    expect(rubricOfferableForRow(screening, technicalRow)).toBe(false);
  });
});
