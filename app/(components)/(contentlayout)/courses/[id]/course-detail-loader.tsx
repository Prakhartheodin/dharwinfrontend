"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getMyStudent, getStudentCourse, mapStudentCourseDetailToCourse } from "@/shared/lib/api/student-courses";
import CourseDetailClient from "./course-detail-client";
import Seo from "@/shared/layout-components/seo/seo";
import type { Course } from "@/shared/data/training/courses-data";

/** Valid MongoDB ObjectId is 24 hex chars; placeholder "_" is used by static export. */
function isValidModuleId(id: string): boolean {
  const trimmed = (id ?? "").trim();
  if (!trimmed || trimmed === "_" || trimmed === "undefined") return false;
  return /^[0-9a-fA-F]{24}$/.test(trimmed);
}

export default function CourseDetailLoader({ moduleId }: { moduleId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const id = (moduleId ?? "").trim();
      if (!id || !isValidModuleId(id)) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const student = await getMyStudent();
        if (cancelled) return;
        const detail = await getStudentCourse(student.id, id);
        if (cancelled) return;
        const mapped = mapStudentCourseDetailToCourse(detail) as Course;
        setCourse(mapped);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 404 || err.response?.status === 403) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load course");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [moduleId]);

  if (loading) {
    return (
      <>
        <Seo title="Loading..." />
        <div className="flex justify-center py-12">
          <div className="ti-btn ti-btn-primary ti-btn-loading">Loading course...</div>
        </div>
      </>
    );
  }

  if (notFound || !course) {
    return (
      <>
        <Seo title="Course not found" />
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-2">Course not found</h2>
          <Link href="/courses/" className="text-primary hover:underline">Back to My Courses</Link>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="Error" />
        <div className="p-8 text-center">
          <p className="text-danger mb-2">{error}</p>
          <Link href="/courses/" className="text-primary hover:underline">Back to My Courses</Link>
        </div>
      </>
    );
  }

  return <CourseDetailClient course={course} />;
}
