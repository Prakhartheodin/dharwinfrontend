"use client";

import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { registerRecruiter } from "@/shared/lib/api/auth";
import { getPhoneCountry, getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import { importRecruitersFromExcel, downloadRecruitersTemplate } from "@/shared/lib/api/users";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

const DRAFT_KEY = "add-recruiter-draft";

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

// Password strength: 0-4 (weak to strong)
function getPasswordStrength(pwd: string): number {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 10) s++;
  if (/[a-zA-Z]/.test(pwd) && /\d/.test(pwd)) s++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd) || /[A-Z]/.test(pwd)) s++;
  return Math.min(s, 4);
}

// Wizard
const Wizard = ({ step: currentIndex, onChange, onSubmit, submitDisabled, children }: any) => {
  const steps = React.Children.toArray(children) as React.ReactElement[];
  const prevStep = currentIndex !== 0 && (steps[currentIndex - 1] as any).props;

  return (
    <div>
      <nav className="btn-group steps basicsteps">
        {steps.map((step: any, index: number) => (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index)}
            className={`btn ${index === currentIndex ? "active" : ""} ${index === currentIndex ? "disabled" : ""}`}
            disabled={index === currentIndex}
          >
            {step.props.title}
          </button>
        ))}
      </nav>
      {steps[currentIndex]}
      <div className="p-3 flex justify-between border-t border-dashed border-defaultborder dark:border-defaultborder/10">
        {prevStep ? (
          <button
            type="button"
            className="ti-btn ti-btn-primary-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onChange(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {currentIndex === steps.length - 1 ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="ti-btn bg-green-600 text-white !py-2 !px-4 !rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitDisabled ? "Submitting..." : "Add Recruiter"}
          </button>
        ) : (
          <button
            type="button"
            className="ti-btn ti-btn-primary-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onChange(currentIndex + 1)}
            disabled={currentIndex === steps.length - 1}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

const Step = ({ children }: any) => children;

// Inline validation helpers
const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const validatePassword = (v: string) => v.length >= 8 && /\d/.test(v) && /[a-zA-Z]/.test(v);
const validateName = (v: string) => v.trim().length > 0;

export const RecruiterWizard = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [excelImportMode, setExcelImportMode] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelImporting, setExcelImporting] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    countryCode: "IN",
    education: "",
    domain: [] as string[],
    location: "",
    profileSummary: "",
  });

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const domain = parsed.domain;
          const domainArr = Array.isArray(domain) ? domain : (domain ? [String(domain)] : []);
          setFormData((prev) => ({ ...prev, ...parsed, domain: domainArr }));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      Swal.fire({ icon: "success", title: "Draft saved", text: "Your form has been saved. You can continue later.", timer: 2000 });
    } catch {
      Swal.fire({ icon: "error", title: "Failed to save draft" });
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData({ name: "", email: "", password: "", phoneNumber: "", countryCode: "IN", education: "", domain: [], location: "", profileSummary: "" });
    Swal.fire({ icon: "success", title: "Draft cleared", timer: 1500 });
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
    setProfilePicture(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePicturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadRecruitersTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recruiters_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Swal.fire({ icon: "error", title: "Failed to download template" });
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setExcelFile(file);
    setExcelImporting(true);
    try {
      const result = await importRecruitersFromExcel(file);
      const msg = result.summary
        ? `Imported ${result.summary.successful} of ${result.summary.total}. Failed: ${result.summary.failed}`
        : result.message || "Import complete.";
      await Swal.fire({ icon: "success", title: "Import complete", text: msg });
      router.push("/ats/recruiters");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Import failed", text: err?.response?.data?.message || err?.message || "Failed to import." });
    } finally {
      setExcelImporting(false);
      setExcelFile(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError("Name, email, and password are required");
      return;
    }
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!validatePassword(formData.password)) {
      setError("Password must be at least 8 characters with 1 letter and 1 number");
      return;
    }
    if (formData.phoneNumber.trim()) {
      const phoneError = getPhoneValidationError(formData.phoneNumber, formData.countryCode);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }
    setLoading(true);
    try {
      await registerRecruiter({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        countryCode: formData.countryCode || undefined,
        education: formData.education.trim() || undefined,
        domain: formData.domain.length > 0 ? formData.domain : undefined,
        location: formData.location.trim() || undefined,
        profileSummary: formData.profileSummary.trim() || undefined,
      });
      localStorage.removeItem(DRAFT_KEY);
      await Swal.fire({ icon: "success", title: "Recruiter Added", text: "The recruiter has been added successfully." });
      router.push("/ats/recruiters");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to add recruiter");
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength(formData.password);
  const nameValid = formData.name.trim().length > 0 ? validateName(formData.name) : null;
  const emailValid = formData.email.trim().length > 0 ? validateEmail(formData.email) : null;
  const pwdValid = formData.password.length > 0 ? validatePassword(formData.password) : null;

  return (
    <div>
      {/* Mode selector */}
      <div className="p-6 border-b border-defaultborder dark:border-defaultborder/10">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setExcelImportMode(false)}
            className={`ti-btn ${!excelImportMode ? "ti-btn-primary-full text-white" : "ti-btn-secondary"}`}
          >
            <i className="ri-user-add-line me-2"></i>
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setExcelImportMode(true)}
            className={`ti-btn ${excelImportMode ? "ti-btn-primary-full text-white" : "ti-btn-secondary"}`}
          >
            <i className="ri-file-excel-line me-2"></i>
            Excel Import
          </button>
        </div>
      </div>

      {excelImportMode ? (
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Excel Import Recruiters</h3>
              <button
                type="button"
                onClick={() => setExcelImportMode(false)}
                className="ti-btn ti-btn-secondary"
              >
                Back to Manual Entry
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">File Format Requirements:</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <strong>Excel Files (.xlsx/.xls):</strong> Single sheet named &quot;Recruiters&quot;</li>
                <li>• <strong>Required Columns:</strong> Name, Email, Password</li>
                <li>• <strong>Optional Columns:</strong> Country Code (e.g. IN, US), Phone (digits only), Education, Domain (use | or , to separate multiple, e.g. IT|Healthcare), Location, Profile Summary</li>
                <li>• <strong>Country Code:</strong> ISO code (IN, US, GB, etc.). Defaults to IN if empty.</li>
                <li>• <strong>Password:</strong> Min 8 characters, at least 1 letter and 1 number</li>
                <li>• Download the template below to see the correct format</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12">
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="ti-btn ti-btn-primary text-white"
                >
                  <i className="ri-file-excel-line me-2"></i>
                  Download Excel Template
                </button>
              </div>
            </div>

            <div className="col-span-12">
              <label className="form-label">Upload File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileChange}
                disabled={excelImporting}
                className="form-control w-full !rounded-md"
              />
              <small className="text-gray-500 text-xs mt-1">Supported formats: .xlsx, .xls</small>
            </div>

            {excelFile && (
              <div className="col-span-12">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold mb-2">Selected File:</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{excelFile.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Size: {(excelFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}

            {excelImporting && (
              <div className="col-span-12">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Importing...</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Please wait while recruiters are being imported.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Wizard step={step} onChange={setStep} onSubmit={handleSubmit} submitDisabled={loading}>
          <Step title={<><i className="ri-user-3-line basicstep-icon"></i> Recruiter Info</>}>
            <div className="p-6">
              <p className="mb-1 font-semibold text-[#8c9097] dark:text-white/50 opacity-50 text-[1.25rem]">01</p>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
              )}
              <div className="grid grid-cols-12 gap-4">
                {/* Profile picture */}
                <div className="xl:col-span-12 col-span-12 mb-4">
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
                      <input type="file" accept=".jpg,.jpeg,.png" onChange={handleProfilePictureChange} className="form-control w-full !rounded-md" id="profilePicture" />
                      <small className="text-gray-500 text-xs mt-1">JPG, JPEG, PNG. Max 5MB.</small>
                    </div>
                    {profilePicturePreview && (
                      <button
                        type="button"
                        onClick={() => { setProfilePicture(null); setProfilePicturePreview(""); }}
                        className="ti-btn ti-btn-danger ti-btn-sm"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="name" className="form-label">Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`form-control w-full !rounded-md pe-10 ${nameValid === false ? "!border-red-500" : nameValid ? "!border-green-500" : ""}`}
                      placeholder="Full name"
                      required
                    />
                    {nameValid !== null && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${nameValid ? "text-green-600" : "text-red-500"}`}>
                        <i className={nameValid ? "ri-check-line" : "ri-close-line"}></i>
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`form-control w-full !rounded-md pe-10 ${emailValid === false ? "!border-red-500" : emailValid ? "!border-green-500" : ""}`}
                      placeholder="xyz@example.com"
                      required
                    />
                    {emailValid !== null && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${emailValid ? "text-green-600" : "text-red-500"}`}>
                        <i className={emailValid ? "ri-check-line" : "ri-close-line"}></i>
                      </span>
                    )}
                  </div>
                </div>

                {/* Password with strength */}
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="password" className="form-label">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`form-control w-full !rounded-md pe-14 ${pwdValid === false ? "!border-red-500" : pwdValid ? "!border-green-500" : ""}`}
                      placeholder="Min 8 chars, 1 letter & 1 number"
                      required
                      minLength={8}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {pwdValid !== null && (
                        <span className={pwdValid ? "text-green-600" : "text-red-500"}>
                          <i className={pwdValid ? "ri-check-line" : "ri-close-line"}></i>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="text-defaulttextcolor/70 hover:text-defaulttextcolor ml-1"
                        aria-label={showPassword ? "Hide" : "Show"}
                      >
                        <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                      </button>
                    </div>
                  </div>
                  {/* Password strength bar */}
                  {formData.password.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${i <= pwdStrength ? (pwdStrength <= 1 ? "bg-red-500" : pwdStrength <= 2 ? "bg-amber-500" : pwdStrength <= 3 ? "bg-yellow-500" : "bg-green-500") : "bg-gray-200 dark:bg-white/10"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="phoneNumber" className="form-label">Phone (optional)</label>
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
                        maxLength={getPhoneCountry(formData.countryCode).maxLength}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="education" className="form-label">Education</label>
                  <input type="text" name="education" id="education" value={formData.education} onChange={handleChange} className="form-control w-full !rounded-md" placeholder="Education" />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="domain" className="form-label">Domain (select multiple or type to add your own)</label>
                  <CreatableSelect
                    isMulti
                    isClearable
                    formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                    options={DOMAIN_OPTIONS}
                    value={formData.domain.map((d) => ({ value: d, label: d }))}
                    onChange={(selected) =>
                      setFormData((p) => ({ ...p, domain: (selected || []).map((s) => s.value) }))
                    }
                    placeholder="Select from list or type to add your own domain..."
                    classNamePrefix="react-select"
                    className="react-select-container"
                  />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="location" className="form-label">Location</label>
                  <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className="form-control w-full !rounded-md" placeholder="Location" />
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <label htmlFor="profileSummary" className="form-label">Profile Summary</label>
                  <textarea name="profileSummary" id="profileSummary" rows={3} value={formData.profileSummary} onChange={handleChange} className="form-control w-full !rounded-md" placeholder="Brief profile summary" />
                </div>
              </div>

              {/* Save draft / Clear draft */}
              <div className="mt-6 flex gap-2">
                <button type="button" onClick={handleSaveDraft} className="ti-btn ti-btn-light text-sm">
                  <i className="ri-save-line me-1"></i> Save draft
                </button>
                <button type="button" onClick={handleClearDraft} className="ti-btn ti-btn-soft-secondary text-sm">
                  <i className="ri-delete-bin-line me-1"></i> Clear draft
                </button>
              </div>
            </div>
          </Step>
        </Wizard>
      )}
    </div>
  );
};
