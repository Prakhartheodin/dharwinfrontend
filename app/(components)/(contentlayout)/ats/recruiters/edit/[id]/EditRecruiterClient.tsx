"use client";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import { getUser, updateUser } from "@/shared/lib/api/users";
import { uploadDocument } from "@/shared/lib/api/employees";
import { getPhoneCountry, getPhoneValidationError, parseStoredPhone } from "@/shared/lib/phoneCountries";
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
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const [profilePictureCleared, setProfilePictureCleared] = useState(false);
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
        // Unwrap legacy E.164 ("+91...") so the country dropdown matches stored data
        // instead of falling back to US for India numbers missing a countryCode hint.
        const parsedPhone = parseStoredPhone(user.phoneNumber, user.countryCode);
        setFormData({
          name: user.name ?? "",
          email: user.email ?? "",
          phoneNumber: parsedPhone.digits,
          countryCode: parsedPhone.countryCode || "IN",
          education: user.education ?? "",
          domain: domainArr,
          location: user.location ?? "",
          profileSummary: user.profileSummary ?? "",
        });
        if (user.profilePicture?.url) {
          setProfilePicturePreview(user.profilePicture.url);
        }
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

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      Swal.fire({ icon: "error", title: "Invalid format", text: "Use JPG, JPEG or PNG. Max 5MB." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File too large", text: "Max 5MB." });
      return;
    }
    setProfilePictureFile(file);
    setProfilePictureCleared(false);
    const reader = new FileReader();
    reader.onload = () => setProfilePicturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleClearProfilePicture = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview("");
    setProfilePictureCleared(true);
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
      // Upload the new profile picture first (if any) so we can include the URL
      // in the user PATCH payload.
      let uploadedPicture: { url: string; key?: string; originalName?: string; size?: number; mimeType?: string } | null = null;
      if (profilePictureFile) {
        setUploadingPicture(true);
        try {
          const uploaded = await uploadDocument(profilePictureFile, profilePictureFile.name);
          uploadedPicture = uploaded;
        } catch (uploadErr: any) {
          setUploadingPicture(false);
          setSubmitting(false);
          await Swal.fire({
            icon: "error",
            title: "Upload failed",
            text: uploadErr?.response?.data?.message || uploadErr?.message || "Could not upload profile picture.",
          });
          return;
        }
        setUploadingPicture(false);
      }

      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        countryCode: formData.countryCode || undefined,
        education: formData.education.trim() || undefined,
        domain: formData.domain,
        location: formData.location.trim() || undefined,
        profileSummary: formData.profileSummary.trim() || undefined,
      };
      if (uploadedPicture) {
        payload.profilePicture = {
          url: uploadedPicture.url,
          key: uploadedPicture.key,
          originalName: uploadedPicture.originalName,
          size: uploadedPicture.size,
          mimeType: uploadedPicture.mimeType,
        };
      } else if (profilePictureCleared) {
        // User explicitly cleared the existing picture — send null to wipe it.
        payload.profilePicture = null;
      }

      await updateUser(recruiterId, payload);
      setProfilePictureFile(null);
      setProfilePictureCleared(false);
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
        <div className="container-fluid max-w-[100vw] px-3 pt-4 pb-6 sm:px-4 sm:pt-6 md:pb-8">
          <div className="py-8 text-center text-muted">Loading...</div>
        </div>
      </Fragment>
    );
  }

  if (loading) {
    return (
      <Fragment>
        <Seo title="Edit Recruiter" />
        <div className="container-fluid max-w-[100vw] px-3 pt-4 pb-6 sm:px-4 sm:pt-6 md:pb-8">
          <div className="py-8 text-center text-muted">Loading...</div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Edit Recruiter" />
      <div className="container-fluid max-w-[100vw] px-3 pt-4 pb-6 sm:px-4 sm:pt-6 md:pb-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box custom-box overflow-hidden">
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
                    {/* Profile picture */}
                    <div className="xl:col-span-12 col-span-12 mb-2">
                      <label className="form-label">Profile Picture (Optional)</label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {profilePicturePreview ? (
                            <img src={profilePicturePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300" />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                              <i className="ri-user-line text-2xl text-gray-400"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            onChange={handleProfilePictureChange}
                            className="form-control w-full !rounded-md"
                            id="profilePicture"
                            disabled={submitting || uploadingPicture}
                          />
                          <small className="text-gray-500 text-xs mt-1">JPG, JPEG, PNG. Max 5MB.</small>
                        </div>
                        {profilePicturePreview && (
                          <button
                            type="button"
                            onClick={handleClearProfilePicture}
                            disabled={submitting || uploadingPicture}
                            className="ti-btn ti-btn-danger ti-btn-sm"
                            title="Remove profile picture"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                      </div>
                    </div>

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
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={submitting || uploadingPicture}>
                      <i className="ri-save-line me-1"></i>
                      {uploadingPicture ? "Uploading…" : submitting ? "Saving..." : "Save Changes"}
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
