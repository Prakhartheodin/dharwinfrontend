"use client";

import React, { useId } from "react";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";
import { getPhoneCountry } from "@/shared/lib/phoneCountries";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import { CountrySelect } from "@/shared/components/CountrySelect";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import {
  getSocialLinkUrlError,
  SOCIAL_PLATFORMS,
} from "@/shared/lib/socialLinks";
import { ProfilePhotoUploader } from "../components/ProfilePhotoUploader";
import styles from "./personal-info-step.module.css";

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
  TN: "TN (NAFTA Professional)",
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

/** ids must be usable by htmlFor/aria — a raw section title has spaces and "&". */
const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let socialIdCounter = 0;
const newSocialId = () => `sl-${Date.now()}-${++socialIdCounter}`;

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
};

const FORM_CONTROL_TAGS = new Set(["input", "select", "textarea"]);

const isFormControl = (node: React.ReactElement): boolean =>
  typeof node.type === "string" && FORM_CONTROL_TAGS.has(node.type);

function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`${styles.field} ${className ?? ""}`.trim()}>
      <label htmlFor={id} id={`${id}-label`} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> *</span> : null}
        {optional ? <span className={styles.labelOptional}> (optional)</span> : null}
      </label>
      {/*
        Only a real form control may take the id — injecting it into a wrapper
        (the phone row is a <div>) pointed <label for> at the div, duplicated the
        id with the inner input, and hid the error from assistive tech. Wrappers
        set id/aria-describedby on their own input instead.
      */}
      {React.isValidElement(children) && isFormControl(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>, {
            id,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
          })
        : children}
      {hint ? (
        <p id={hintId} className={styles.fieldHint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SectionProps = {
  icon: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
};

function Section({ icon, title, hint, children }: SectionProps) {
  const headingId = `${slugify(title)}-heading`;
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon} aria-hidden="true">
          <i className={icon} />
        </span>
        <div>
          <h3 id={headingId} className={styles.sectionTitle}>
            {title}
          </h3>
          {hint ? <p className={styles.sectionHint}>{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function PersonalInfoStep() {
  const pi = useWorkforceStore((s) => s.personalInfo);
  const setPersonalInfo = useWorkforceStore((s) => s.setPersonalInfo);
  const { issuesByField, mode, currentIndex, steps, submitAttempted } = useWizardContext();
  const auth = useAuth();
  const fileInputId = useId();
  // Errors stay quiet until the user leaves a field (or presses Save), so an
  // untouched form doesn't open covered in red.
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = React.useState(false);

  const showCompanyEmail =
    hasPermission(auth, "create_employee") || hasPermission(auth, "update_employee");
  const showPasswordField = mode === "create-admin";
  const isSelfService =
    mode === "self-service-employee" || mode === "self-service-candidate";
  const emailReadOnly = isSelfService;
  // Job title, company mailbox, and HR immigration/compensation fields are
  // admin-owned: the self-service PATCH omits them, so editable inputs would
  // discard changes silently or risk clearing server values on save.
  const adminOwnedReadOnly = isSelfService;
  const hrOwnedHint = "Managed by your administrator.";

  const fieldErr = (key: string): string | null => {
    if (!submitAttempted && !touched[key]) return null;
    const list = issuesByField[`personalInfo.${key}`];
    if (!list || list.length === 0) return null;
    const err = list.find((i) => i.severity === "error");
    return err?.message ?? null;
  };

  const markTouched = (key: string) => () =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const onText = <K extends keyof typeof pi>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setPersonalInfo({ [key]: e.target.value } as Partial<typeof pi>);

  const onAddress = (key: keyof typeof pi.address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setPersonalInfo({ address: { ...pi.address, [key]: e.target.value } });

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

  const inputClass = (hasError?: boolean, readOnly?: boolean) =>
    [
      styles.input,
      hasError ? styles.inputError : "",
      readOnly ? styles.inputReadOnly : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className={styles.step}>
      <header className={styles.stepHeader}>
        {/* Step count comes from the wizard — candidate mode has no Salary step. */}
        <p className={styles.stepEyebrow}>
          Step {currentIndex + 1} of {steps.length}
        </p>
        <h2 className={styles.stepTitle}>Personal information</h2>
        <p className={styles.stepLead}>
          Start with who you are and how we can reach you. Required fields are marked with an asterisk.
        </p>
      </header>

      <Section
        icon="ri-user-3-line"
        title="Identity & contact"
        hint="Your name, login email, and primary phone number."
      >
        <div className={styles.identityCard}>
          <ProfilePhotoUploader
            variant="wizard"
            inputId={fileInputId}
            previewUrl={pi.profilePicture?.url ?? ""}
            uploadOnApply
            onUploaded={(meta) =>
              setPersonalInfo({
                profilePicture: {
                  url: meta.url,
                  key: meta.key,
                  originalName: meta.originalName,
                  size: meta.size,
                  mimeType: meta.mimeType,
                },
                profilePictureFile: null,
                profilePictureRemoved: false,
              })
            }
            onRemove={() =>
              setPersonalInfo({
                profilePictureFile: null,
                profilePicture: undefined,
                profilePictureRemoved: true,
              })
            }
          />

          <div className={`${styles.identityFields} ${styles.gridFull}`}>
            <Field id="fullName" label="Full name" required error={fieldErr("fullName")}>
              <input
                type="text"
                value={pi.fullName}
                onChange={onText("fullName")}
                onBlur={markTouched("fullName")}
                className={inputClass(Boolean(fieldErr("fullName")))}
                placeholder="Your legal name"
                autoComplete="name"
              />
            </Field>

            <Field
              id="email"
              label="Email"
              required
              error={fieldErr("email")}
              hint={emailReadOnly ? "Login email is managed by your administrator." : undefined}
            >
              <input
                type="email"
                value={pi.email}
                onChange={onText("email")}
                onBlur={markTouched("email")}
                disabled={emailReadOnly}
                readOnly={emailReadOnly}
                className={inputClass(Boolean(fieldErr("email")), emailReadOnly)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </Field>

            {/* id lives on the input, not the row — see the note in Field. */}
            <Field
              id="phoneNumber"
              label="Phone number"
              required
              error={fieldErr("phoneNumber")}
              className={styles.gridFull}
            >
              <div className={styles.phoneRow} role="group" aria-labelledby="phoneNumber-label">
                <PhoneCountrySelect
                  name="countryCode"
                  value={pi.countryCode}
                  onChange={(code) => setPersonalInfo({ countryCode: code })}
                />
                <input
                  id="phoneNumber"
                  type="tel"
                  value={pi.phoneNumber}
                  onChange={onText("phoneNumber")}
                  onBlur={markTouched("phoneNumber")}
                  className={inputClass(Boolean(fieldErr("phoneNumber")))}
                  placeholder={phoneCountry.placeholder}
                  maxLength={phoneCountry.maxLength}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-invalid={fieldErr("phoneNumber") ? true : undefined}
                  aria-describedby={fieldErr("phoneNumber") ? "phoneNumber-error" : undefined}
                />
              </div>
            </Field>
          </div>
        </div>

        {showCompanyEmail ? (
          <div className={`${styles.grid} ${styles.gridOffsetTop}`}>
            <Field
              id="companyAssignedEmail"
              label="Company / work email"
              optional
              hint={
                adminOwnedReadOnly
                  ? "Your work mailbox is managed by your administrator."
                  : "Google Workspace or Microsoft 365 mailbox — separate from login email."
              }
            >
              <input
                type="email"
                value={pi.companyAssignedEmail}
                onChange={onText("companyAssignedEmail")}
                readOnly={adminOwnedReadOnly}
                className={inputClass(false, adminOwnedReadOnly)}
                placeholder="name@yourcompany.com"
                autoComplete="email"
              />
            </Field>
            <Field id="companyEmailProvider" label="Mailbox provider">
              <select
                value={pi.companyEmailProvider}
                onChange={(e) =>
                  setPersonalInfo({
                    companyEmailProvider: e.target.value as typeof pi.companyEmailProvider,
                  })
                }
                disabled={adminOwnedReadOnly}
                className={styles.select}
              >
                <option value="">Auto-detect from address</option>
                <option value="gmail">Google / Gmail</option>
                <option value="outlook">Microsoft / Outlook</option>
                <option value="unknown">Other / unknown</option>
              </select>
            </Field>
          </div>
        ) : null}
      </Section>

      <Section
        icon="ri-briefcase-4-line"
        title="Work & immigration"
        hint="Role details, visa status, and compensation range."
      >
        <div className={styles.grid}>
          <Field
            id="designation"
            label="Position / job title"
            optional
            hint={
              adminOwnedReadOnly ? "Your job title is set by your administrator." : undefined
            }
          >
            <input
              type="text"
              value={pi.designation}
              onChange={onText("designation")}
              readOnly={adminOwnedReadOnly}
              className={inputClass(false, adminOwnedReadOnly)}
              placeholder="e.g. Software Engineer"
              autoComplete="organization-title"
            />
          </Field>

          <Field id="degree" label="Degree" optional>
            <input
              type="text"
              value={pi.degree}
              onChange={onText("degree")}
              className={styles.input}
              placeholder="Highest qualification"
            />
          </Field>

          <Field
            id="supervisorName"
            label="Supervisor name"
            optional
            hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
          >
            <input
              type="text"
              value={pi.supervisorName}
              onChange={onText("supervisorName")}
              readOnly={adminOwnedReadOnly}
              className={inputClass(false, adminOwnedReadOnly)}
              placeholder="Manager or advisor"
            />
          </Field>

          <Field
            id="supervisorContact"
            label="Supervisor phone"
            optional
            hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
          >
            <div className={styles.phoneRow}>
              <PhoneCountrySelect
                name="supervisorCountryCode"
                value={pi.supervisorCountryCode || pi.countryCode}
                onChange={(code) => setPersonalInfo({ supervisorCountryCode: code })}
                disabled={adminOwnedReadOnly}
              />
              <input
                type="tel"
                value={pi.supervisorContact}
                onChange={onText("supervisorContact")}
                readOnly={adminOwnedReadOnly}
                className={inputClass(false, adminOwnedReadOnly)}
                placeholder={supervisorCountry.placeholder}
                maxLength={supervisorCountry.maxLength}
                inputMode="numeric"
                autoComplete="tel-national"
              />
            </div>
          </Field>

          <Field
            id="sevisId"
            label="SEVIS ID"
            optional
            hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
          >
            <input
              type="text"
              value={pi.sevisId}
              onChange={onText("sevisId")}
              readOnly={adminOwnedReadOnly}
              className={inputClass(false, adminOwnedReadOnly)}
              placeholder="If applicable"
            />
          </Field>

          <Field
            id="ead"
            label="EAD"
            optional
            hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
          >
            <input
              type="text"
              value={pi.ead}
              onChange={onText("ead")}
              readOnly={adminOwnedReadOnly}
              className={inputClass(false, adminOwnedReadOnly)}
              placeholder="Employment authorization"
            />
          </Field>

          {/* Not marked required: the rule is a warning by design (staff outside
              the US have no visa), and fieldErr only surfaces hard errors. */}
          <Field
            id="visaType"
            label="Visa type"
            error={fieldErr("visaType")}
            hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
          >
            <select
              value={pi.visaType}
              onChange={onText("visaType")}
              onBlur={markTouched("visaType")}
              disabled={adminOwnedReadOnly}
              className={`${styles.select} ${fieldErr("visaType") ? styles.inputError : ""} ${adminOwnedReadOnly ? styles.inputReadOnly : ""}`}
            >
              <option value="">Select visa type</option>
              {VISA_TYPES.map((v) => (
                <option key={v} value={v}>
                  {VISA_LABELS[v]}
                </option>
              ))}
            </select>
          </Field>

          {pi.visaType === "Other" ? (
            <Field
              id="customVisaType"
              label="Custom visa type"
              required
              hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
            >
              <input
                type="text"
                value={pi.customVisaType}
                onChange={onText("customVisaType")}
                readOnly={adminOwnedReadOnly}
                className={inputClass(false, adminOwnedReadOnly)}
                placeholder="Enter visa type"
              />
            </Field>
          ) : null}

          <Field
            id="salaryRange"
            label="Salary range"
            optional
            hint={adminOwnedReadOnly ? hrOwnedHint : undefined}
          >
            <select
              value={pi.salaryRange}
              onChange={onText("salaryRange")}
              disabled={adminOwnedReadOnly}
              className={`${styles.select} ${adminOwnedReadOnly ? styles.inputReadOnly : ""}`}
            >
              <option value="">Select salary range</option>
              {SALARY_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* No asterisks here: the API accepts a partial address and nothing
          validates these, so marking them required was a false promise. */}
      <Section icon="ri-map-pin-line" title="Address" hint="Where you currently live or receive mail.">
        <div className={styles.addressPanel}>
          <div className={styles.grid}>
            <Field id="streetAddress" label="Street address" className={styles.gridFull}>
              <input
                type="text"
                value={pi.address.streetAddress}
                onChange={onAddress("streetAddress")}
                className={styles.input}
                placeholder="Street number and name"
                autoComplete="address-line1"
              />
            </Field>

            <Field id="streetAddress2" label="Street address line 2" optional className={styles.gridFull}>
              <input
                type="text"
                value={pi.address.streetAddress2}
                onChange={onAddress("streetAddress2")}
                className={styles.input}
                placeholder="Apartment, suite, unit, building, floor"
                autoComplete="address-line2"
              />
            </Field>

            <Field id="city" label="City">
              <input
                type="text"
                value={pi.address.city}
                onChange={onAddress("city")}
                className={styles.input}
                placeholder="City"
                autoComplete="address-level2"
              />
            </Field>

            <Field id="state" label="State / territory / military post">
              <input
                type="text"
                value={pi.address.state}
                onChange={onAddress("state")}
                className={styles.input}
                placeholder="State or territory"
                autoComplete="address-level1"
              />
            </Field>

            <Field id="zipCode" label="ZIP code">
              <input
                type="text"
                value={pi.address.zipCode}
                onChange={onAddress("zipCode")}
                className={styles.input}
                placeholder="ZIP / postal code"
                autoComplete="postal-code"
              />
            </Field>

            <Field id="country" label="Country">
              <CountrySelect
                value={pi.address.country}
                onChange={(name) =>
                  setPersonalInfo({ address: { ...pi.address, country: name } })
                }
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section icon="ri-quill-pen-line" title="About you" hint="A short summary for your profile.">
        <Field id="bio" label="Short bio" optional className={styles.gridFull}>
          <textarea
            value={pi.shortBio}
            onChange={onText("shortBio")}
            className={styles.textarea}
            rows={4}
            placeholder="Briefly describe your background, skills, or goals."
          />
        </Field>
      </Section>

      <Section
        icon="ri-links-line"
        title="Social links"
        hint="Add at least one profile where recruiters or teammates can learn more about you."
      >
        <div className={styles.socialHeader}>
          {/* Nothing enforces this and the API accepts an empty list — an
              asterisk here promised a rule that does not exist. */}
          <span className={styles.label}>Profiles</span>
          <button type="button" onClick={addSocialLink} className={styles.addLinkBtn}>
            <i className="ri-add-line" aria-hidden="true" />
            Add link
          </button>
        </div>

        {pi.socialLinks.length === 0 ? (
          <p className={styles.emptySocial}>
            No links yet. Add LinkedIn, GitHub, or a portfolio URL to complete this section.
          </p>
        ) : (
          pi.socialLinks.map((link, index) => (
            <div key={link.id} className={styles.socialCard}>
              <Field
                id={`social-platform-${link.id}`}
                label="Platform"
                required
                className={styles.col5}
              >
                <select
                  className={styles.select}
                  value={link.platform}
                  onChange={(e) => setSocialLink(index, "platform", e.target.value)}
                >
                  <option value="">Select platform</option>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id={`social-url-${link.id}`}
                label="URL"
                required
                className={styles.col6}
                error={
                  link.url
                    ? getSocialLinkUrlError(link.platform, link.url)
                    : null
                }
              >
                <input
                  type="text"
                  className={`${styles.input} ${
                    link.url && getSocialLinkUrlError(link.platform, link.url)
                      ? styles.inputError
                      : ""
                  }`}
                  placeholder="linkedin.com/in/you"
                  value={link.url}
                  onChange={(e) => setSocialLink(index, "url", e.target.value)}
                  inputMode="url"
                />
              </Field>
              <div className={`${styles.socialRemoveCell} ${styles.col1}`}>
                <button
                  type="button"
                  onClick={() => removeSocialLink(index)}
                  className={styles.socialRemove}
                  aria-label={`Remove social link ${index + 1}`}
                >
                  <i className="ri-close-line" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </Section>

      {showPasswordField ? (
        <Section icon="ri-lock-password-line" title="Account security">
          <div className={styles.grid}>
            <Field
              id="password"
              label="Password"
              required
              hint="At least 8 characters."
              error={fieldErr("password")}
            >
              <div className={styles.passwordRow}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={pi.password}
                  onChange={onText("password")}
                  onBlur={markTouched("password")}
                  className={inputClass(Boolean(fieldErr("password")))}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  aria-invalid={fieldErr("password") ? true : undefined}
                  aria-describedby={
                    [
                      "password-hint",
                      fieldErr("password") ? "password-error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <i
                    className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </Field>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
