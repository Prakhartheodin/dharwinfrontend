"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createOffer } from "@/shared/lib/api/offers";
import { listJobApplications, type JobApplication } from "@/shared/lib/api/jobApplications";

const CreateOffer = () => {
  const router = useRouter();
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    jobApplicationId: "",
    base: 0,
    hra: 0,
    gross: 0,
    joiningDate: "",
    offerValidityDate: "",
    notes: "",
  });

  useEffect(() => {
    listJobApplications({ limit: 200 })
      .then((res) => {
        const all = res.results ?? [];
        // Show Applied, Screening, Interview - exclude Offered/Hired/Rejected (already have offers or closed)
        const eligible = all.filter(
          (ja) => ja.status && ["Applied", "Screening", "Interview"].includes(ja.status)
        );
        setJobApplications(eligible);
      })
      .catch(() => setJobApplications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.jobApplicationId || !form.gross) {
      setError("Please select a job application and enter gross CTC");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(form.jobApplicationId)) {
      setError("Invalid job application selected");
      return;
    }
    setSubmitting(true);
    try {
      await createOffer({
        jobApplicationId: form.jobApplicationId,
        ctcBreakdown: {
          base: form.base,
          hra: form.hra,
          gross: form.gross,
          currency: "INR",
        },
        joiningDate: form.joiningDate || undefined,
        offerValidityDate: form.offerValidityDate || undefined,
        notes: form.notes || undefined,
      });
      router.push("/ats/offers-placement?refresh=" + Date.now());
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <Seo title="Create Offer" />
      <Pageheader
        currentpage="Create Offer"
        activepage="Offers & Placement"
        mainpage="Create Offer"
      />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box overflow-hidden">
              <div className="box-header">
                <h5 className="box-title">Create Offer</h5>
                <Link
                  href="/ats/offers-placement"
                  className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.875rem]"
                >
                  <i className="ri-arrow-left-line me-1"></i>Back to Offers
                </Link>
              </div>
              <div className="box-body">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="form-label">
                      Job Application <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={form.jobApplicationId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, jobApplicationId: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select application...</option>
                      {jobApplications.map((ja) => {
                        const appId = (ja as { _id?: string; id?: string })._id ?? (ja as { id?: string }).id ?? ''
                        return (
                          <option key={appId} value={appId}>
                            {ja.job?.title} – {ja.candidate?.fullName} ({ja.candidate?.email})
                          </option>
                        )
                      })}
                      {!loading && jobApplications.length === 0 && (
                        <option disabled>No applications available</option>
                      )}
                    </select>
                    {!loading && jobApplications.length === 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-3 rounded-lg bg-gray-50 dark:bg-black/20 space-y-1">
                        <p className="font-medium">No applications available to create an offer.</p>
                        <p className="text-xs">Offers can only be created from applications in <strong>Applied</strong>, <strong>Screening</strong>, or <strong>Interview</strong> stage (not Offered, Hired, or Rejected).</p>
                        <Link href="/ats/job-applications" className="text-primary hover:underline text-xs inline-block mt-2">
                          Go to Job Applications →
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="form-label">Base (CTC)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.base || ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, base: Number(e.target.value) || 0 }))
                        }
                        placeholder="0"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="form-label">HRA</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.hra || ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, hra: Number(e.target.value) || 0 }))
                        }
                        placeholder="0"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Gross CTC <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.gross || ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, gross: Number(e.target.value) || 0 }))
                        }
                        placeholder="0"
                        min={0}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="form-label">Joining Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.joiningDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, joiningDate: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="form-label">Offer Validity Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.offerValidityDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, offerValidityDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      placeholder="Optional notes"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={submitting || (!loading && jobApplications.length === 0)}
                    >
                      {submitting ? (
                        <>
                          <i className="ri-loader-4-line animate-spin me-1"></i>Creating...
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line me-1"></i>Create Offer
                        </>
                      )}
                    </button>
                    <Link
                      href="/ats/offers-placement"
                      className="ti-btn ti-btn-light"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default CreateOffer;
