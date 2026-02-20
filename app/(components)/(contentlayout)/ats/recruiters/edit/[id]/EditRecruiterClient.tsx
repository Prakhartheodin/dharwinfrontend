"use client";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import { getUser, updateUser } from "@/shared/lib/api/users";
import { getPhoneCountry, getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";

const CreatableSelect = dynamic(() => import("react-select/creatable"), { ssr: false });

const DOMAIN_OPTIONS = [
  { value: "IT / Technology", label: "IT / Technology" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Finance / Banking", label: "Finance / Banking" },
  { value: "Engineering", label: "Engineering" },
  { value: "Sales & Marketing", label: "Sales & Marketing" },
  { value: "Human Resources", label: "Human Resources" },
  { value: "Operations", label: "Operations" },
  { value: "Legal", label: "Legal" },
  { value: "Education", label: "Education" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Retail", label: "Retail" },
  { value: "Consulting", label: "Consulting" },
  { value: "Media & Communication", label: "Media & Communication" },
];

export default function EditRecruiterClient() {
  const router = useRouter();
  const params = useParams();
  const recruiterId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    countryCode: "IN",
    education: "",
    domain: [] as string[],
    location: "",
    profileSummary: "",
  });

  useEffect(() => {
    if (!recruiterId || recruiterId === "_") return;
    getUser(recruiterId)
      .then((user) => {
        const domain = user.domain;
        const domainArr = Array.isArray(domain) ? domain : domain ? [String(domain)] : [];
        setFormData({
          name: user.name ?? "",
          email: user.email ?? "",
          phoneNumber: user.phoneNumber ?? "",
          countryCode: user.countryCode ?? "IN",
          education: user.education ?? "",
          domain: domainArr,
          location: user.location ?? "",
          profileSummary: user.profileSummary ?? "",
        });
      })
      .catch(() => {
        Swal.fire({ icon: "error", title: "Error", text: "Recruiter not found." });
        router.push("/ats/recruiters");
      })
      .finally(() => setLoading(false));
  }, [recruiterId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiterId || recruiterId === "_") return;
    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required");
      return;
    }
    if (formData.phoneNumber.trim()) {
      const phoneError = getPhoneValidationError(formData.phoneNumber, formData.countryCode);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateUser(recruiterId, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        countryCode: formData.countryCode || undefined,
        education: formData.education.trim() || undefined,
        domain: formData.domain,
        location: formData.location.trim() || undefined,
        profileSummary: formData.profileSummary.trim() || undefined,
      });
      await Swal.fire({ icon: "success", title: "Updated", text: "Recruiter profile has been updated." });
      router.push("/ats/recruiters");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update recruiter");
    } finally {
      setSubmitting(false);
    }
  };

  if (recruiterId === "_") {
    return (
      <Fragment>
        <Seo title="Edit Recruiter" />
        <Pageheader currentpage="Edit Recruiter" activepage="Recruiters" mainpage="Edit Recruiter" />
        <div className="container py-8 text-center text-muted">Loading...</div>
      </Fragment>
    );
  }

  if (loading) {
    return (
      <Fragment>
        <Seo title="Edit Recruiter" />
        <Pageheader currentpage="Edit Recruiter" activepage="Recruiters" mainpage="Edit Recruiter" />
        <div className="container py-8 text-center text-muted">Loading...</div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Edit Recruiter" />
      <Pageheader currentpage="Edit Recruiter" activepage="Recruiters" mainpage="Edit Recruiter" />
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="box">
              <div className="box-header flex justify-between items-center">
                <div className="box-title">Edit Recruiter</div>
                <Link href="/ats/recruiters" className="ti-btn ti-btn-secondary !py-1 !px-2 !text-sm">
                  <i className="ri-arrow-left-line me-1"></i>Back
                </Link>
              </div>
              <div className="box-body">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
                  )}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="xl:col-span-6 col-span-12">
                      <label htmlFor="name" className="form-label">Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="form-control w-full !rounded-md"
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-control w-full !rounded-md"
                        placeholder="xyz@example.com"
                        required
                      />
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label htmlFor="phoneNumber" className="form-label">Phone</label>
                      <div className="flex gap-2">
                        <PhoneCountrySelect
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={(code) => setFormData((p) => ({ ...p, countryCode: code }))}
                        />
                        <div className="flex-1">
                          <input
                            type="tel"
                            name="phoneNumber"
                            id="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="form-control w-full !rounded-md"
                            placeholder={getPhoneCountry(formData.countryCode).placeholder}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label htmlFor="education" className="form-label">Education</label>
                      <input
                        type="text"
                        name="education"
                        id="education"
                        value={formData.education}
                        onChange={handleChange}
                        className="form-control w-full !rounded-md"
                        placeholder="Education"
                      />
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label className="form-label">Domain</label>
                      <CreatableSelect
                        isMulti
                        isClearable
                        formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                        options={DOMAIN_OPTIONS}
                        value={formData.domain.map((d) => ({ value: d, label: d }))}
                        onChange={(selected) =>
                          setFormData((p) => ({ ...p, domain: (selected || []).map((s) => s.value) }))
                        }
                        placeholder="Select or type to add..."
                        classNamePrefix="react-select"
                        className="react-select-container"
                      />
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label htmlFor="location" className="form-label">Location</label>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="form-control w-full !rounded-md"
                        placeholder="Location"
                      />
                    </div>
                    <div className="xl:col-span-12 col-span-12">
                      <label htmlFor="profileSummary" className="form-label">Profile Summary</label>
                      <textarea
                        name="profileSummary"
                        id="profileSummary"
                        rows={4}
                        value={formData.profileSummary}
                        onChange={handleChange}
                        className="form-control w-full !rounded-md"
                        placeholder="Brief profile summary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-defaultborder dark:border-defaultborder/10">
                    <Link href="/ats/recruiters" className="ti-btn ti-btn-secondary">
                      Cancel
                    </Link>
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={submitting}>
                      <i className="ri-save-line me-1"></i>
                      {submitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
