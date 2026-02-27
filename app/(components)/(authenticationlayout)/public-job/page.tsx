"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { getPublicJobs, PublicJob, PublicJobsListParams } from "@/shared/lib/api/jobs";

export default function PublicJobsPage() {
  const router = useRouter();
  
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filters
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [filterJobType, setFilterJobType] = useState("");
  const [filterExperienceLevel, setFilterExperienceLevel] = useState("");

  const limit = 12;

  useEffect(() => {
    loadJobs();
  }, [page, searchTitle, searchLocation, filterJobType, filterExperienceLevel]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params: PublicJobsListParams = {
        page,
        limit,
      };

      if (searchTitle.trim()) params.title = searchTitle.trim();
      if (searchLocation.trim()) params.location = searchLocation.trim();
      if (filterJobType) params.jobType = filterJobType;
      if (filterExperienceLevel) params.experienceLevel = filterExperienceLevel;

      const result = await getPublicJobs(params);
      setJobs(result.results);
      setTotalPages(result.totalPages);
      setTotalResults(result.totalResults);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page on new search
    loadJobs();
  };

  const handleClearFilters = () => {
    setSearchTitle("");
    setSearchLocation("");
    setFilterJobType("");
    setFilterExperienceLevel("");
    setPage(1);
  };

  return (
    <>
      <Seo title="Browse Jobs - Find Your Dream Job" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Find Your Dream Job
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Browse {totalResults} active job openings
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="e.g. New York"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Type
                </label>
                <select
                  value={filterJobType}
                  onChange={(e) => setFilterJobType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experience Level
                </label>
                <select
                  value={filterExperienceLevel}
                  onChange={(e) => setFilterExperienceLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Levels</option>
                  <option value="Entry Level">Entry Level</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior Level">Senior Level</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSearch}
                className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-semibold"
              >
                Search Jobs
              </button>
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg text-gray-600 dark:text-gray-400">Loading jobs...</p>
            </div>
          )}

          {/* No Results */}
          {!loading && jobs.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Jobs Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your search filters to find more opportunities.
              </p>
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Jobs Grid */}
          {!loading && jobs.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer overflow-hidden"
                    onClick={() => router.push(`/public-job/${job.id}`)}
                  >
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {job.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 font-semibold">
                        {job.organisation.name}
                      </p>
                      
                      {job.location && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                          📍 {job.location}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                          {job.jobType}
                        </span>
                        {job.experienceLevel && (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">
                            {job.experienceLevel}
                          </span>
                        )}
                      </div>

                      {job.salaryRange && (job.salaryRange.min || job.salaryRange.max) && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-3">
                          💰 {job.salaryRange.currency || "USD"}{" "}
                          {job.salaryRange.min?.toLocaleString() || "N/A"} -{" "}
                          {job.salaryRange.max?.toLocaleString() || "N/A"}
                        </p>
                      )}

                      {job.skillTags && job.skillTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {job.skillTags.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skillTags.length > 3 && (
                            <span className="px-2 py-1 text-gray-500 dark:text-gray-500 text-xs">
                              +{job.skillTags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <button className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-semibold">
                        View Details & Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Previous
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-4 py-2 rounded-lg transition ${
                            page === pageNum
                              ? "bg-primary text-white"
                              : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
