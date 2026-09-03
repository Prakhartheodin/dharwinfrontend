"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getMyStudent, getStudentCourse, peekMyStudentId, mapStudentCourseDetailToCourse } from "@/shared/lib/api/student-courses";
import CourseLearnClient from "./course-learn-client";
import Seo from "@/shared/layout-components/seo/seo";
import type { Course } from "@/shared/data/training/courses-data";

/** Valid MongoDB ObjectId is 24 hex chars; placeholder "_" is used by static export. */
function isValidModuleId(id: string): boolean {
  const trimmed = (id ?? "").trim();
  if (!trimmed || trimmed === "_" || trimmed === "undefined") return false;
  return /^[0-9a-fA-F]{24}$/.test(trimmed);
}

/** Layout placeholder shown while student + course load. */
function CourseLearnSkeleton() {
  return (
    <div className="min-h-[70vh] animate-pulse" aria-busy="true" aria-label="Loading course">
      <div className="h-14 border-b border-[#d1d7dc] dark:border-white/10 px-6 flex items-center gap-3">
        <div className="h-4 w-24 rounded bg-[#e4e8eb] dark:bg-white/10" />
        <div className="h-4 flex-1 max-w-md rounded bg-[#e4e8eb] dark:bg-white/10" />
      </div>
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1">
          <div className="aspect-video bg-[#1c1d1f]" />
          <div className="p-6 space-y-3">
            <div className="h-4 w-40 rounded bg-[#e4e8eb] dark:bg-white/10" />
            <div className="h-4 w-full rounded bg-[#e4e8eb] dark:bg-white/10" />
            <div className="h-4 w-2/3 rounded bg-[#e4e8eb] dark:bg-white/10" />
          </div>
        </div>
        <div className="hidden lg:block w-80 border-l border-[#d1d7dc] dark:border-white/10 p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-[#e4e8eb] dark:bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CourseLearnLoader({ moduleId }: { moduleId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
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
        const studentPromise = getMyStudent();
        const cachedId = peekMyStudentId();
        const coursePromise = cachedId
          ? getStudentCourse(cachedId, id)
          : studentPromise.then((student) => getStudentCourse(student.id, id));
        const [student, detail] = await Promise.all([studentPromise, coursePromise]);
        if (cancelled) return;
        setStudentId(student.id);
        setCourse(mapStudentCourseDetailToCourse(detail) as Course);
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
    void load();
    return () => { cancelled = true; };
  }, [moduleId]);

  if (loading) {
    return (
      <>
        <Seo title="Loading..." />
        <CourseLearnSkeleton />
      </>
    );
  }

  if (notFound || !course) {
    return (
      <>
        <Seo title="Course not found" />
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Course not found</h2>
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

  if (!studentId) return null;

  return (
    <CourseLearnClient
      course={course}
      studentId={studentId}
      moduleId={moduleId}
    />
  );
}
