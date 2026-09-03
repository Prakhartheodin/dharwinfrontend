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

/**
 * Designed loading skeleton matching the course landing layout.
 */
function CourseDetailSkeleton() {
  return (
    <div className="max-w-[1120px] mx-auto pb-12 animate-pulse" aria-busy="true" aria-label="Loading course">
      <div className="h-4 w-48 rounded bg-[#e4e8eb] dark:bg-white/10 mb-5" />
      <div className="rounded-2xl overflow-hidden border border-[#e4e8eb] dark:border-white/10 bg-[#1c1d1f]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_38%]">
          <div className="p-8 space-y-4">
            <div className="h-8 w-4/5 rounded-lg bg-white/15" />
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-20 rounded-full bg-white/10" />
              <div className="h-8 w-28 rounded-full bg-white/10" />
            </div>
            <div className="h-11 w-44 rounded-lg bg-primary/40 mt-4" />
          </div>
          <div className="aspect-video lg:min-h-[280px] bg-white/10" />
        </div>
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-40 rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03]" />
        <div className="h-56 rounded-2xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03]" />
      </div>
    </div>
  );
}

/**
 * Empty or error card with a back CTA.
 */
function CourseDetailStatus({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="max-w-[32rem] mx-auto py-16 px-6 text-center">
      <span className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden>
        <i className="ti ti-book-off text-[1.5rem]" />
      </span>
      <h2 className="text-[1.25rem] font-bold text-[#1c1d1f] dark:text-white mb-2">{title}</h2>
      <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60 mb-6">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button type="button" className="ti-btn ti-btn-primary min-h-11" onClick={onRetry}>
            Try again
          </button>
        )}
        <Link href="/courses/" className="ti-btn ti-btn-outline-primary min-h-11">
          Back to My Courses
        </Link>
      </div>
    </div>
  );
}

export default function CourseDetailLoader({ moduleId }: { moduleId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
  }, [moduleId, retryKey]);

  if (loading) {
    return (
      <>
        <Seo title="Loading course" />
        <CourseDetailSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="Couldn’t load course" />
        <CourseDetailStatus
          title="Couldn’t load this course"
          message={error}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </>
    );
  }

  if (notFound || !course) {
    return (
      <>
        <Seo title="Course not found" />
        <CourseDetailStatus
          title="Course not found"
          message="This course isn’t in your library, or the link is invalid."
        />
      </>
    );
  }

  return <CourseDetailClient course={course} />;
}
