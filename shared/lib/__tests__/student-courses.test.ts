import { describe, it, expect } from "vitest";
import {
  mapStudentCourseToCard,
  resolveCourseThumbnailUrl,
  COURSE_THUMBNAIL_PLACEHOLDER,
  type StudentCourseListItem,
} from "../api/student-courses";

const baseItem = (): StudentCourseListItem => ({
  module: {
    id: "507f1f77bcf86cd799439011",
    moduleName: "Data Analysis & Reporting",
    categories: [{ id: "cat1", name: "Operation Analyst" }],
  },
  progress: { percentage: 100 },
  enrolledAt: "2026-01-01T00:00:00.000Z",
  status: "completed",
});

describe("resolveCourseThumbnailUrl", () => {
  it("returns placeholder for empty values", () => {
    expect(resolveCourseThumbnailUrl(undefined)).toBe(COURSE_THUMBNAIL_PLACEHOLDER);
    expect(resolveCourseThumbnailUrl("")).toBe(COURSE_THUMBNAIL_PLACEHOLDER);
    expect(resolveCourseThumbnailUrl("   ")).toBe(COURSE_THUMBNAIL_PLACEHOLDER);
  });

  it("returns trimmed url when present", () => {
    expect(resolveCourseThumbnailUrl(" https://cdn.example.com/cover.jpg ")).toBe(
      "https://cdn.example.com/cover.jpg"
    );
  });
});

describe("mapStudentCourseToCard", () => {
  it("uses placeholder when cover image url is missing", () => {
    const card = mapStudentCourseToCard(baseItem());
    expect(card.thumbnail).toBe(COURSE_THUMBNAIL_PLACEHOLDER);
  });

  it("keeps cover image url from API when present", () => {
    const item = baseItem();
    item.module.coverImage = {
      key: "training-module-cover-images/abc.png",
      url: "https://s3.amazonaws.com/bucket/abc.png?X-Amz-Signature=fresh",
    };
    const card = mapStudentCourseToCard(item);
    expect(card.thumbnail).toBe("https://s3.amazonaws.com/bucket/abc.png?X-Amz-Signature=fresh");
  });
});
