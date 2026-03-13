"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Fragment, useState, useEffect } from "react";
import { browseJobs as browseJobsApi, type Job } from "@/shared/lib/api/jobs";
import { formatSalaryRange, mapExperienceLevel } from "@/shared/lib/ats/jobMappers";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Freelance"];
const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Executive"];

export default function BrowseJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState<string>("");
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt:desc");

  useEffect(() => {
    setLoading(true);
    browseJobsApi({
      limit: 12,
      page,
      search: search || undefined,
      jobType: jobType || undefined,
      location: location || undefined,
      experienceLevel: experienceLevel || undefined,
      sortBy,
    })
      .then((res) => {
        setJobs(res.results ?? []);
        setTotalPages(res.totalPages ?? 1);
        setTotalResults(res.totalResults ?? 0);
      })
      .catch(() => {
        setJobs([]);
        setTotalPages(1);
        setTotalResults(0);
      })
      .finally(() => setLoading(false));
  }, [page, search, jobType, location, experienceLevel, sortBy]);

  return (
    <Fragment>
      <Seo title="Browse Jobs" />
      <div className="container-fluid pt-6">
        <div className="box custom-box mb-4">
          <div className="box-body">
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-3 col-span-12">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Title, company, location..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Job Type</label>
                <select
                  className="form-select"
                  value={jobType}
                  onChange={(e) => {
                    setJobType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="City or region"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Experience</label>
                <select
                  className="form-select"
                  value={experienceLevel}
                  onChange={(e) => {
                    setExperienceLevel(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Sort</label>
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="createdAt:desc">Newest</option>
                  <option value="createdAt:asc">Oldest</option>
                  <option value="title:asc">Title A–Z</option>
                  <option value="title:desc">Title Z–A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 text-defaulttextcolor dark:text-white/70">
          {totalResults === 0
            ? "No jobs"
            : `Showing ${(page - 1) * 12 + 1}-${Math.min(page * 12, totalResults)} of ${totalResults} job${totalResults !== 1 ? "s" : ""}`}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="ti-btn ti-btn-primary ti-btn-loading">Loading...</div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="box custom-box">
            <div className="box-body text-center py-12">
              <p className="text-defaulttextcolor dark:text-white/70">No active jobs match your filters.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0 overflow-hidden rounded-lg border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg shadow-sm">
            {jobs.map((job, index) => {
              const id = job._id ?? job.id ?? "";
              const companyInitial = (job.organisation?.name || "J").charAt(0).toUpperCase();
              const metaParts = [
                job.location && (
                  <span key="loc" className="inline-flex items-center gap-1">
                    <i className="bi bi-geo-alt text-[0.75rem] opacity-70" />
                    {job.location}
                  </span>
                ),
                job.jobType && (
                  <span key="type" className="inline-flex items-center gap-1">
                    <i className="bi bi-briefcase text-[0.75rem] opacity-70" />
                    {job.jobType}
                  </span>
                ),
                job.experienceLevel && (
                  <span key="exp" className="inline-flex items-center gap-1">
                    <i className="bi bi-mortarboard text-[0.75rem] opacity-70" />
                    {mapExperienceLevel(job.experienceLevel)}
                  </span>
                ),
                job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) && (
                  <span key="sal" className="inline-flex items-center gap-1">
                    <i className="bi bi-coin text-[0.75rem] opacity-70" />
                    {formatSalaryRange(job.salaryRange)}
                  </span>
                ),
              ].filter(Boolean);
              return (
                <Link
                  key={id}
                  href={`/ats/browse-jobs/${id}`}
                  prefetch={true}
                  onMouseEnter={() => router.prefetch(`/ats/browse-jobs/${id}`)}
                  className={"block group transition-colors duration-150 " + (index > 0 ? "border-t border-defaultborder dark:border-defaultborder/10" : "")}
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-4 px-4 sm:px-5 py-4 hover:bg-defaultborder/5 dark:hover:bg-white/5">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-base">
                      {companyInitial}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h5 className="font-semibold text-[1rem] text-defaulttextcolor dark:text-white group-hover:text-primary transition-colors">
                        {job.title}
                      </h5>
                      <p className="text-[0.8125rem] text-defaulttextcolor/70 dark:text-white/60">
                        {job.organisation?.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-defaulttextcolor/70 dark:text-white/55">
                        {metaParts.map((part, i) => (
                          <Fragment key={i}>
                            {i > 0 && <span className="text-defaulttextcolor/30 dark:text-white/30">·</span>}
                            {part}
                          </Fragment>
                        ))}
                      </div>
                      {job.skillTags && job.skillTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.skillTags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="badge bg-primary/10 text-primary !rounded-md !px-2 !py-0.5 text-[0.7rem] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 w-full sm:w-auto sm:self-center">
                      <span className="ti-btn ti-btn-primary ti-btn-sm inline-flex flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap !py-2 !px-5 !min-w-[8.5rem] group-hover:opacity-90 transition-opacity">
                        View & Apply
                        <i className="bi bi-arrow-right text-[0.875rem] shrink-0" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              type="button"
              className="ti-btn ti-btn-light"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="flex items-center px-4 text-defaulttextcolor">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="ti-btn ti-btn-light"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Fragment>
  );
}
