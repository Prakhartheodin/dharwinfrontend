import { describe, expect, it } from "vitest";
import { rubricOfferableForRow } from "../JobRoundPlanSection";
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

  it("keeps the rubric the row already holds, even when it no longer matches", () => {
    // Changing the round type after picking a rubric must not blank the select and drop the
    // saved choice on the next save.
    const screening = template("t-screening", "screening");
    expect(rubricOfferableForRow(screening, row("technical", "t-screening"))).toBe(true);
  });

  it("keeps an archived rubric only while it is the selected one", () => {
    const archived = template("t-old", "screening", "2026-09-10T00:00:00.000Z");
    expect(rubricOfferableForRow(archived, row("screening"))).toBe(false);
    expect(rubricOfferableForRow(archived, row("screening", "t-old"))).toBe(true);
  });
});
