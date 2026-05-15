"use client";

import React, { useEffect } from "react";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";
import { getPhoneCountry } from "@/shared/lib/phoneCountries";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";

const VISA_TYPES = [
  "F-1", "J-1", "H-1B", "H-2B", "L-1", "O-1", "P-1",
  "R-1", "TN", "E-1", "E-2", "E-3", "B-1", "B-2", "Other",
];
const VISA_LABELS: Record<string, string> = {
  "F-1": "F-1 (Student Visa)",
  "J-1": "J-1 (Exchange Visitor)",
  "H-1B": "H-1B (Specialty Occupation)",
  "H-2B": "H-2B (Temporary Non-Agricultural Worker)",
  "L-1": "L-1 (Intracompany Transferee)",
  "O-1": "O-1 (Extraordinary Ability)",
  "P-1": "P-1 (Athlete/Entertainer)",
  "R-1": "R-1 (Religious Worker)",
  "TN": "TN (NAFTA Professional)",
  "E-1": "E-1 (Treaty Trader)",
  "E-2": "E-2 (Treaty Investor)",
  "E-3": "E-3 (Australian Professional)",
  "B-1": "B-1 (Business Visitor)",
  "B-2": "B-2 (Tourist)",
  Other: "Other",
};

const SALARY_RANGES = [
  "Under $5,000",
  "$5,000 - $10,000",
  "$10,000 - $15,000",
  "$15,000 - $20,000",
  "$20,000 - $30,000",
  "$30,000 - $50,000",
  "$50,000 - $70,000",
  "$70,000 - $90,000",
  "$90,000 - $110,000",
  "$110,000 - $130,000",
  "$130,000 - $150,000",
  "$150,000 - $200,000",
  "$200,000 - $250,000",
  "$250,000 - $300,000",
  "$300,000 - $400,000",
  "$400,000+",
  "Prefer not to disclose",
];

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "India",
  "China",
  "Japan",
  "Brazil",
  "Mexico",
  "Other",
];

const SOCIAL_PLATFORMS = [
  "LinkedIn", "GitHub", "Twitter", "Facebook",
  "Instagram", "Portfolio", "Website", "Other",
];

const validateURL = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

let socialIdCounter = 0;
const newSocialId = () => `sl-${Date.now()}-${++socialIdCounter}`;

export function PersonalInfoStep() {
  const pi = useWorkforceStore((s) => s.personalInfo);
  const setPersonalInfo = useWorkforceStore((s) => s.setPersonalInfo);
  const { issuesByField, mode, role } = useWizardContext();

  const showCompanyEmail = role === "admin" || role === "recruiter";
  const showPasswordField = mode === "create-admin";
  const emailReadOnly =
    mode === "self-service-employee" || mode === "self-service-candidate";

  const fieldErr = (key: string): string | null => {
    const list = issuesByField[`personalInfo.${key}`];
    if (!list || list.length === 0) return null;
    const err = list.find((i) => i.severity === "error");
    return err?.message ?? null;
  };

  const onText = <K extends keyof typeof pi>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setPersonalInfo({ [key]: e.target.value } as Partial<typeof pi>);

  const onAddress = (key: keyof typeof pi.address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setPersonalInfo({ address: { ...pi.address, [key]: e.target.value } });

  const onProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPersonalInfo({ profilePictureFile: null });
      return;
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = "";
      return;
    }
    setPersonalInfo({ profilePictureFile: file, profilePictureRemoved: false });
  };

  const removeProfilePicture = () => {
    setPersonalInfo({
      profilePictureFile: null,
      profilePicture: undefined,
      profilePictureRemoved: true,
    });
  };

  const previewUrl = React.useMemo(() => {
    if (pi.profilePictureFile) return URL.createObjectURL(pi.profilePictureFile);
    return pi.profilePicture?.url ?? "";
  }, [pi.profilePictureFile, pi.profilePicture?.url]);

  // Revoke object URLs we created so the browser releases the file. Server
  // URLs from `pi.profilePicture?.url` do not need revocation.
  useEffect(() => {
    if (!pi.profilePictureFile) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [pi.profilePictureFile, previewUrl]);

  const addSocialLink = () =>
    setPersonalInfo({
      socialLinks: [...pi.socialLinks, { id: newSocialId(), platform: "", url: "" }],
    });
  const removeSocialLink = (index: number) =>
    setPersonalInfo({
      socialLinks: pi.socialLinks.filter((_, i) => i !== index),
    });
  const setSocialLink = (index: number, key: "platform" | "url", value: string) =>
    setPersonalInfo({
      socialLinks: pi.socialLinks.map((l, i) =>
        i === index ? { ...l, [key]: value } : l,
      ),
    });

  const phoneCountry = getPhoneCountry(pi.countryCode);
  const supervisorCountry = getPhoneCountry(pi.supervisorCountryCode || pi.countryCode);

  return (
    <div className="p-6 w-full">
      <p className="mb-1 font-semibold text-[#8c9097] dark:text-white/50 opacity-50 text-[1.25rem]">01</p>
      <div className="grid grid-cols-12 gap-6 w-full">
        <div className="xl:col-span-12 col-span-12 mb-4">
          <label className="form-label">Profile Picture (Optional)</label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
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
                onChange={onProfilePictureChange}
                className="form-control w-full !rounded-md"
                id="profilePicture"
              />
              <small className="text-gray-500 text-xs mt-1">
                Supported formats: JPG, JPEG, PNG only. Max size: 5MB
              </small>
            </div>
            {previewUrl && (
              <button
                type="button"
                onClick={removeProfilePicture}
                className="ti-btn ti-btn-danger ti-btn-sm"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            )}
          </div>
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="fullName" className="form-label">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={pi.fullName}
            onChange={onText("fullName")}
            className={`form-control w-full !rounded-md ${fieldErr("fullName") ? "border-red-500" : ""}`}
            placeholder="Full Name"
          />
          {fieldErr("fullName") && (
            <div className="text-red-500 text-sm mt-1">{fieldErr("fullName")}</div>
          )}
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="email" className="form-label">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={pi.email}
            onChange={onText("email")}
            disabled={emailReadOnly}
            className={`form-control w-full !rounded-md ${fieldErr("email") ? "border-red-500" : ""}`}
            placeholder="xyz@example.com"
          />
          {fieldErr("email") && (
            <div className="text-red-500 text-sm mt-1">{fieldErr("email")}</div>
          )}
        </div>

        {showCompanyEmail && (
          <>
            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="companyAssignedEmail" className="form-label">
                Company / work email{" "}
                <span className="text-textmuted font-normal text-xs">(optional)</span>
              </label>
              <input
                type="email"
                id="companyAssignedEmail"
                value={pi.companyAssignedEmail}
                onChange={onText("companyAssignedEmail")}
                className="form-control w-full !rounded-md"
                placeholder="name@yourcompany.com"
              />
              <small className="text-gray-500 text-xs mt-1 block">
                Google Workspace or Microsoft 365 mailbox — separate from login email above.
              </small>
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="companyEmailProvider" className="form-label">Mailbox provider</label>
              <select
                id="companyEmailProvider"
                value={pi.companyEmailProvider}
                onChange={(e) =>
                  setPersonalInfo({
                    companyEmailProvider:
                      e.target.value as typeof pi.companyEmailProvider,
                  })
                }
                className="form-control w-full !rounded-md"
              >
                <option value="">Auto-detect from address</option>
                <option value="gmail">Google / Gmail</option>
                <option value="outlook">Microsoft / Outlook</option>
                <option value="unknown">Other / unknown</option>
              </select>
            </div>
          </>
        )}

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="phone" className="form-label">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <PhoneCountrySelect
              name="countryCode"
              value={pi.countryCode}
              onChange={(code) => setPersonalInfo({ countryCode: code })}
            />
            <input
              type="tel"
              id="phone"
              value={pi.phoneNumber}
              onChange={onText("phoneNumber")}
              className={`form-control flex-1 min-w-0 !rounded-md ${fieldErr("phoneNumber") ? "!border-red-500" : ""}`}
              placeholder={phoneCountry.placeholder}
              maxLength={phoneCountry.maxLength}
              inputMode="numeric"
            />
          </div>
          {fieldErr("phoneNumber") && (
            <div className="text-red-500 text-sm mt-1">{fieldErr("phoneNumber")}</div>
          )}
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="sevisId" className="form-label">SEVIS ID</label>
          <input
            type="text"
            id="sevisId"
            value={pi.sevisId}
            onChange={onText("sevisId")}
            className="form-control w-full !rounded-md"
            placeholder="SEVIS ID"
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="ead" className="form-label">EAD</label>
          <input
            type="text"
            id="ead"
            value={pi.ead}
            onChange={onText("ead")}
            className="form-control w-full !rounded-md"
            placeholder="EAD"
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="degree" className="form-label">Degree</label>
          <input
            type="text"
            id="degree"
            value={pi.degree}
            onChange={onText("degree")}
            className="form-control w-full !rounded-md"
            placeholder="Degree"
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="designation" className="form-label">Position / job title</label>
          <input
            type="text"
            id="designation"
            value={pi.designation}
            onChange={onText("designation")}
            className="form-control w-full !rounded-md"
            placeholder="e.g. Software Engineer"
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="supervisorName" className="form-label">Supervisor Name</label>
          <input
            type="text"
            id="supervisorName"
            value={pi.supervisorName}
            onChange={onText("supervisorName")}
            className="form-control w-full !rounded-md"
            placeholder="supervisor name"
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="supervisorContact" className="form-label">Supervisor Phone No.</label>
          <div className="flex gap-2">
            <PhoneCountrySelect
              name="supervisorCountryCode"
              value={pi.supervisorCountryCode || pi.countryCode}
              onChange={(code) => setPersonalInfo({ supervisorCountryCode: code })}
            />
            <input
              type="tel"
              id="supervisorContact"
              value={pi.supervisorContact}
              onChange={onText("supervisorContact")}
              className="form-control flex-1 min-w-0 !rounded-md"
              placeholder={supervisorCountry.placeholder}
              maxLength={supervisorCountry.maxLength}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="visaType" className="form-label">
            Visa Type <span className="text-red-500">*</span>
          </label>
          <select
            id="visaType"
            value={pi.visaType}
            onChange={onText("visaType")}
            className={`form-control w-full !rounded-md ${fieldErr("visaType") ? "border-red-500" : ""}`}
          >
            <option value="">Select Visa Type</option>
            {VISA_TYPES.map((v) => (
              <option key={v} value={v}>
                {VISA_LABELS[v]}
              </option>
            ))}
          </select>
          {fieldErr("visaType") && (
            <div className="text-red-500 text-sm mt-1">{fieldErr("visaType")}</div>
          )}
        </div>

        {pi.visaType === "Other" && (
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="customVisaType" className="form-label">
              Custom Visa Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="customVisaType"
              value={pi.customVisaType}
              onChange={onText("customVisaType")}
              className="form-control w-full !rounded-md"
              placeholder="Enter visa type"
            />
          </div>
        )}

        <div className="xl:col-span-6 col-span-12">
          <label htmlFor="salaryRange" className="form-label">
            Salary Range <span className="text-red-500">*</span>
          </label>
          <select
            id="salaryRange"
            value={pi.salaryRange}
            onChange={onText("salaryRange")}
            className="form-control w-full !rounded-md"
          >
            <option value="">Select Salary Range</option>
            {SALARY_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-12 col-span-12">
          <div className="grid grid-cols-12 gap-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="xl:col-span-12 col-span-12">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Address Information
              </h4>
            </div>

            <div className="xl:col-span-12 col-span-12">
              <label htmlFor="streetAddress" className="form-label">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="streetAddress"
                value={pi.address.streetAddress}
                onChange={onAddress("streetAddress")}
                className="form-control w-full !rounded-md"
                placeholder="Enter street address"
              />
            </div>

            <div className="xl:col-span-12 col-span-12">
              <label htmlFor="streetAddress2" className="form-label">Street Address Line 2</label>
              <input
                type="text"
                id="streetAddress2"
                value={pi.address.streetAddress2}
                onChange={onAddress("streetAddress2")}
                className="form-control w-full !rounded-md"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>

            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="city" className="form-label">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                value={pi.address.city}
                onChange={onAddress("city")}
                className="form-control w-full !rounded-md"
                placeholder="Enter city"
              />
            </div>

            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="state" className="form-label">
                State (Territory or Military Post) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="state"
                value={pi.address.state}
                onChange={onAddress("state")}
                className="form-control w-full !rounded-md"
                placeholder="Enter state, territory, or military post"
              />
            </div>

            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="zipCode" className="form-label">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="zipCode"
                value={pi.address.zipCode}
                onChange={onAddress("zipCode")}
                className="form-control w-full !rounded-md"
                placeholder="Enter ZIP code"
              />
            </div>

            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="country" className="form-label">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                id="country"
                value={pi.address.country}
                onChange={onAddress("country")}
                className="form-control w-full !rounded-md"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="xl:col-span-12 col-span-12">
          <label htmlFor="bio" className="form-label">Short Bio</label>
          <textarea
            id="bio"
            value={pi.shortBio}
            onChange={onText("shortBio")}
            className="form-control w-full !rounded-md"
            rows={3}
          />
        </div>

        <div className="xl:col-span-12 col-span-12">
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>
              Social Links <span className="text-red-500">*</span> :
            </div>
            <button
              type="button"
              onClick={addSocialLink}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Social Link
            </button>
          </div>

          {pi.socialLinks.map((link, index) => (
            <div
              key={link.id}
              className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3"
            >
              <button
                type="button"
                onClick={() => removeSocialLink(index)}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">
                  Platform <span className="text-red-500">*</span>
                </label>
                <select
                  className="form-control w-full !rounded-md"
                  value={link.platform}
                  onChange={(e) => setSocialLink(index, "platform", e.target.value)}
                >
                  <option value="">Select Platform</option>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  className="form-control w-full !rounded-md"
                  placeholder="https://example.com"
                  value={link.url}
                  onChange={(e) => setSocialLink(index, "url", e.target.value)}
                />
                {link.url && !validateURL(link.url) && (
                  <div className="text-red-500 text-sm mt-1">Please enter a valid URL</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showPasswordField && (
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="password" className="form-label">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={pi.password}
              onChange={onText("password")}
              className={`form-control w-full !rounded-md ${fieldErr("password") ? "border-red-500" : ""}`}
              placeholder="Enter password"
            />
            {fieldErr("password") && (
              <div className="text-red-500 text-sm mt-1">{fieldErr("password")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
