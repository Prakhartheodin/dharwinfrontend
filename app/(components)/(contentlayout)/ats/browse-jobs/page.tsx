"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState, useEffect } from "react";
import { browseJobs as browseJobsApi, type Job } from "@/shared/lib/api/jobs";
import { formatSalaryRange, mapExperienceLevel } from "@/shared/lib/ats/jobMappers";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Freelance"];
const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Executive"];

export default function BrowseJobsPage() {
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
      <Pageheader currentpage="Browse Jobs" activepage="ATS" mainpage="Browse Jobs" />
      <div className="container">
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
          <div className="grid grid-cols-12 gap-6">
            {jobs.map((job) => {
              const id = job._id ?? job.id ?? "";
              const companyInitial = (job.organisation?.name || "J").charAt(0).toUpperCase();
              const metaParts = [
                job.location && (
                  <span key="loc" className="inline-flex items-center gap-1">
                    <i className="bi bi-geo-alt text-[0.75rem]" />
                    {job.location}
                  </span>
                ),
                job.jobType && (
                  <span key="type" className="inline-flex items-center gap-1">
                    <i className="bi bi-briefcase text-[0.75rem]" />
                    {job.jobType}
                  </span>
                ),
                job.experienceLevel && (
                  <span key="exp" className="inline-flex items-center gap-1">
                    <i className="bi bi-mortarboard text-[0.75rem]" />
                    {mapExperienceLevel(job.experienceLevel)}
                  </span>
                ),
                job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) && (
                  <span key="sal" className="inline-flex items-center gap-1">
                    <i className="bi bi-coin text-[0.75rem]" />
                    {formatSalaryRange(job.salaryRange)}
                  </span>
                ),
              ].filter(Boolean);
              return (
                <div key={id} className="xxl:col-span-4 lg:col-span-6 col-span-12">
                  <Link href={`/ats/browse-jobs/${id}`} className="block h-full group">
                    <div className="box custom-box h-full flex flex-col transition-all duration-200 group-hover:shadow-md group-hover:border-primary/20 dark:group-hover:border-primary/30">
                      <div className="box-body flex-1 flex gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                          {companyInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-semibold mb-0.5 text-primary group-hover:underline">
                            {job.title}
                          </h5>
                          <p className="text-[0.8125rem] text-defaulttextcolor/80 mb-2">
                            {job.organisation?.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-defaulttextcolor/80">
                            {metaParts.map((part, i) => (
                              <Fragment key={i}>
                                {i > 0 && <span className="text-defaulttextcolor/40">|</span>}
                                {part}
                              </Fragment>
                            ))}
                          </div>
                          {job.skillTags && job.skillTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {job.skillTags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="badge bg-primary/10 text-primary !rounded-full text-[0.7rem]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="box-footer border-t dark:border-defaultborder/10 pt-3">
                        <span className="ti-btn ti-btn-primary ti-btn-sm !w-full !min-w-0 !h-auto !py-2 flex items-center justify-center gap-1.5 whitespace-nowrap">
                          View & Apply
                          <i className="bi bi-arrow-right text-[0.875rem] shrink-0" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
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
