import { describe, it, expect } from "vitest";
import { matchesCourseQuery, suggestCourseTitles } from "../course-search-match";

/** The three titles from issue #007. */
const TITLES = [
  "MLOps & AI System Deployment",
  "Machine Learning & Deep Learning Fundamentals",
  "Data Engineering & Model Development Pipeline",
];

describe("matchesCourseQuery", () => {
  it("matches an abbreviation against word initials (issue #007)", () => {
    expect(TITLES.filter((t) => matchesCourseQuery(t, "ML"))).toEqual([
      "MLOps & AI System Deployment",
      "Machine Learning & Deep Learning Fundamentals",
    ]);
  });

  it("is case-insensitive", () => {
    expect(matchesCourseQuery("Machine Learning", "ml")).toBe(true);
  });

  it("still matches plain substrings", () => {
    expect(matchesCourseQuery("Machine Learning", "learn")).toBe(true);
    expect(matchesCourseQuery("Machine Learning", "zzz")).toBe(false);
  });

  it("requires consecutive words for the initials rule", () => {
    expect(matchesCourseQuery("Data Engineering & Model Development Pipeline", "MP")).toBe(false);
  });

  it("treats regex metacharacters as literal text", () => {
    expect(matchesCourseQuery("Intro to C++ (basics)", "C++ (")).toBe(true);
    expect(matchesCourseQuery("Intro to C++ (basics)", ".*")).toBe(false);
  });
});

describe("suggestCourseTitles", () => {
  it("returns nothing for a blank query", () => {
    expect(suggestCourseTitles(TITLES, "  ")).toEqual([]);
  });

  it("puts titles starting with the query first", () => {
    expect(suggestCourseTitles(TITLES, "ML")).toEqual([
      "MLOps & AI System Deployment",
      "Machine Learning & Deep Learning Fundamentals",
    ]);
  });

  it("stops suggesting once the box holds the only match", () => {
    expect(suggestCourseTitles(TITLES, "MLOps & AI System Deployment")).toEqual([]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Machine Learning ${i}`);
    expect(suggestCourseTitles(many, "ML")).toHaveLength(8);
    expect(suggestCourseTitles(many, "ML", 3)).toHaveLength(3);
  });
});
