"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { AxiosError } from "axios";
import { AuthPageLayout } from "@/shared/components/auth-page-layout";
import { AuthFormCard } from "@/shared/components/auth-form-card";
import { AuthFieldError, AUTH_ERROR_COLOR } from "@/shared/components/auth-field-error";
import { PublicApplyCaptcha } from "@/shared/components/ats/PublicApplyCaptcha";
import { usePublicApplyCaptcha } from "@/shared/hooks/usePublicApplyCaptcha";
import {
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
} from "@/shared/lib/auth-validation";

const FIELD_IDS = {
  name: "register-name",
  email: "register-email",
  password: "register-password",
  confirm: "register-confirm",
} as const;
type Field = keyof typeof FIELD_IDS;
type Values = Record<Field, string>;
const FIELDS = Object.keys(FIELD_IDS) as Field[];

function validateField(field: Field, v: Values): string | null {
  switch (field) {
    case "name": return v.name.trim() ? null : "Full name is required.";
    case "email": return validateEmail(v.email);
    case "password": return validateNewPassword(v.password);
    case "confirm": return validateConfirmPassword(v.password, v.confirm);
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
  }
  return "Registration failed. Please try again.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string | null>>>({});
  const values: Values = { name, email, password, confirm: confirmPassword };
  const {
    config: captchaConfig,
    ensureCaptchaReady,
    setCaptchaToken,
    registerCaptchaReset,
    finalizeProtectedAttempt,
    handleCaptchaApiError,
    captchaRetryMessage,
  } = usePublicApplyCaptcha();

  /** Once a field shows an error, re-check it as the user types so it clears the moment it's fixed. */
  const onFieldChange = (field: Field, value: string, set: (v: string) => void) => {
    set(value);
    setError("");
    const next = { ...values, [field]: value };
    setFieldErrors((p) => {
      const out = { ...p };
      if (p[field]) out[field] = validateField(field, next);
      if (field === "password" && p.confirm) out.confirm = validateField("confirm", next);
      return out;
    });
  };

  /** Validate on blur, but don't flag an empty field the user merely tabbed past. */
  const onFieldBlur = (field: Field, e: React.FocusEvent<HTMLInputElement>, baseColor: string) => {
    const msg = values[field] ? validateField(field, values) : null;
    e.target.style.borderColor = msg ? AUTH_ERROR_COLOR : baseColor;
    setFieldErrors((p) => ({ ...p, [field]: msg }));
  };

  const fieldA11y = (field: Field) => ({
    "aria-invalid": Boolean(fieldErrors[field]),
    "aria-describedby": fieldErrors[field] ? `${FIELD_IDS[field]}-error` : undefined,
  });
  const borderColor = (field: Field, base: string) => (fieldErrors[field] ? AUTH_ERROR_COLOR : base);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const next = Object.fromEntries(FIELDS.map((f) => [f, validateField(f, values)])) as Record<Field, string | null>;
    setFieldErrors(next);
    const firstInvalid = FIELDS.find((f) => next[f]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    const captchaError = ensureCaptchaReady();
    if (captchaError) {
      // The hook's default copy is written for the apply form (resume/application).
      setError(captchaConfig.misconfigured ? captchaError : "Complete the security check before registering.");
      return;
    }
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const res = await usersApi.publicRegisterUser({ name: trimmedName, email: trimmedEmail, password });
      router.push(`${ROUTES.signIn}?registered=1&message=${encodeURIComponent(res.message ?? "Registration successful.")}`);
    } catch (err) {
      setError(handleCaptchaApiError(err) ? captchaRetryMessage : getErrorMessage(err));
    } finally {
      finalizeProtectedAttempt();
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible, color = "#98A2B3" }: { visible: boolean; color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {!visible && <path d="M2 2L22 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );

  return (
    <Fragment>
      <Seo title="Register" />
      <AuthPageLayout>
        <AuthFormCard>
              {/* Frame 10: Title */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  width: "100%",
                  maxWidth: 396,
                  alignSelf: "center",
                }}
              >
                <h1
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    fontSize: 28,
                    lineHeight: "100%",
                    color: "#101828",
                    margin: 0,
                  }}
                >
                  Create your account
                </h1>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 14, color: "#5A5A5D", margin: 0 }}>
                  Your account will be pending until an administrator activates it.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: 396,
                    padding: "12px 16px",
                    background: "#fdecea",
                    border: "1px solid #f5c6cb",
                    color: "#c62828",
                    borderRadius: 8,
                    fontSize: 14,
                    lineHeight: "150%",
                  }}
                >
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 24,
                  width: "100%",
                  maxWidth: 396,
                  alignSelf: "center",
                }}
              >
                {/* Frame 18: Input fields - gap 24px */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 24,
                    width: "100%",
                  }}
                >
                  {/* Frame 26: Full Name */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <label htmlFor="register-name" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="register-name"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => onFieldChange("name", e.target.value, setName)}
                      autoComplete="name"
                      required
                      {...fieldA11y("name")}
                      className="w-full max-w-full"
                      style={{
                        height: 48,
                        padding: "12px 16px",
                        border: `1px solid ${borderColor("name", "#D0D5DD")}`,
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 400,
                        color: "#344054",
                        outline: "none",
                        fontFamily: "'Poppins', sans-serif",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                      onBlur={(e) => onFieldBlur("name", e, "#D0D5DD")}
                    />
                    <AuthFieldError id="register-name-error" message={fieldErrors.name} />
                  </div>

                  {/* Frame 26: Email */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <label htmlFor="register-email" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="register-email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => onFieldChange("email", e.target.value, setEmail)}
                      autoComplete="email"
                      inputMode="email"
                      required
                      {...fieldA11y("email")}
                      className="w-full max-w-full"
                      style={{
                        height: 48,
                        padding: "12px 16px",
                        border: `3px solid ${borderColor("email", "#D1E9FF")}`,
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 400,
                        color: "#344054",
                        outline: "none",
                        fontFamily: "'Poppins', sans-serif",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                      onBlur={(e) => onFieldBlur("email", e, "#D1E9FF")}
                    />
                    <AuthFieldError id="register-email-error" message={fieldErrors.email} />
                  </div>

                  {/* Frame 26: Password */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <label htmlFor="register-password" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}>
                      Password
                    </label>
                    <div style={{ position: "relative", width: "100%" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="register-password"
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => onFieldChange("password", e.target.value, setPassword)}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        required
                        {...fieldA11y("password")}
                        className="w-full max-w-full"
                        style={{
                          height: 48,
                          padding: "12px 48px 12px 16px",
                          border: `1px solid ${borderColor("password", "#D0D5DD")}`,
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 400,
                          color: "#344054",
                          outline: "none",
                          fontFamily: "'Poppins', sans-serif",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                        onBlur={(e) => onFieldBlur("password", e, "#D0D5DD")}
                      />
                      <button
                        type="button"
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 16,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <EyeIcon visible={showPassword} />
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>{PASSWORD_HINT}</p>
                    <AuthFieldError id="register-password-error" message={fieldErrors.password} />
                  </div>

                  {/* Frame 26: Confirm Password */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <label htmlFor="register-confirm" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}>
                      Confirm Password
                    </label>
                    <div style={{ position: "relative", width: "100%" }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="register-confirm"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => onFieldChange("confirm", e.target.value, setConfirmPassword)}
                        autoComplete="new-password"
                        required
                        {...fieldA11y("confirm")}
                        className="w-full max-w-full"
                        style={{
                          height: 48,
                          padding: "12px 48px 12px 16px",
                          border: `1px solid ${borderColor("confirm", "#D0D5DD")}`,
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 400,
                          color: "#344054",
                          outline: "none",
                          fontFamily: "'Poppins', sans-serif",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                        onBlur={(e) => onFieldBlur("confirm", e, "#D0D5DD")}
                      />
                      <button
                        type="button"
                        aria-label="toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: "absolute",
                          right: 16,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <EyeIcon visible={showConfirmPassword} />
                      </button>
                    </div>
                    <AuthFieldError id="register-confirm-error" message={fieldErrors.confirm} />
                  </div>
                </div>

                <PublicApplyCaptcha onTokenChange={setCaptchaToken} onRegisterReset={registerCaptchaReset} />

                {/* Frame 30: Button + Sign in link - gap 24px */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 24,
                    width: "100%",
                  }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full max-w-full"
                    style={{
                      height: 52,
                      background: "#34B34C",
                      borderRadius: 8,
                      border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#FCFCFD",
                      fontFamily: "'Poppins', sans-serif",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => { if (!loading) (e.target as HTMLElement).style.background = "#2da043"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#34B34C"; }}
                  >
                    {loading ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      "Register now"
                    )}
                  </button>

                  {/* Frame 29: Sign in link */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#98A2B3", textTransform: "capitalize" }}>
                      Already Have An Account ?
                    </span>
                    <Link href={ROUTES.signIn} style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#34B34C", textDecoration: "none", textTransform: "capitalize" }}>
                      Sign In
                    </Link>
                  </div>
                </div>
              </form>
        </AuthFormCard>
      </AuthPageLayout>
    </Fragment>
  );
}
