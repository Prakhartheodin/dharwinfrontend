"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { AxiosError } from "axios";
import {
  COUNTRY_PHONE_RULES,
  DEFAULT_COUNTRY_CODE,
  getCountryRuleByCode,
  toFullPhone,
  validatePhoneForCountry,
  getPhoneErrorForCountry,
} from "@/shared/lib/country-phone";

const PASSWORD_MIN_LENGTH = 8;

function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
  }
  return "Registration failed. Please try again.";
}

/**
 * Public candidate onboarding page (no login required).
 * Linked from preboarding invitation emails: token, email, expires in query.
 * Per SHARE_CANDIDATE_FORM.md – onboarding form links must be public.
 */
export default function CandidateOnboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    const expires = searchParams.get("expires");

    if (!token || !emailParam || !expires) {
      setLinkError("Invalid or missing link parameters. Please use the link from your invitation email.");
      return;
    }
    const expirationTime = parseInt(expires, 10);
    if (Number.isNaN(expirationTime) || Date.now() > expirationTime) {
      setLinkError("This link has expired. Please request a new onboarding link.");
      return;
    }
    try {
      setEmail(decodeURIComponent(emailParam));
    } catch {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must contain at least 1 letter and 1 number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const trimmedPhone = phoneNational.trim();
    if (trimmedPhone) {
      const rule = getCountryRuleByCode(countryCode);
      if (!validatePhoneForCountry(trimmedPhone, rule)) {
        setError(getPhoneErrorForCountry(rule));
        return;
      }
    }
    setLoading(true);
    try {
      const fullPhone = trimmedPhone ? toFullPhone(getCountryRuleByCode(countryCode).dialCode, trimmedPhone) : undefined;
      const res = await usersApi.publicRegisterCandidate({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phoneNumber: fullPhone,
      });
      router.push(
        `${ROUTES.signIn}?registered=1&message=${encodeURIComponent(res.message ?? "Registration successful. You can sign in.")}`
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (linkError) {
    return (
      <Fragment>
        <Seo title="Onboarding link invalid" />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-bodybg px-4">
          <div className="max-w-md w-full bg-white dark:bg-white/5 rounded-xl shadow-lg border border-gray-200 dark:border-white/10 p-8 text-center">
            <div className="text-danger mb-4">
              <i className="ri-links-line text-4xl" />
            </div>
            <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Invalid or expired link</h1>
            <p className="text-defaulttextcolor/80 dark:text-white/70 mb-6">{linkError}</p>
            <Link href={ROUTES.signIn} className="ti-btn ti-btn-primary">
              Go to sign in
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Complete your onboarding" />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-bodybg px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-white/5 rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-defaulttextcolor dark:text-white">Complete your onboarding</h1>
              <p className="text-sm text-defaulttextcolor/70 dark:text-white/60 mt-1">
                Create your account using the email from your invitation.
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="onboard-name" className="form-label">
                  Full name
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="onboard-email" className="form-label">
                  Email
                </label>
                <input
                  id="onboard-email"
                  type="email"
                  className="form-control bg-gray-100 dark:bg-black/20"
                  value={email}
                  readOnly
                  aria-readonly
                />
                <p className="text-[0.75rem] text-defaulttextcolor/60 mt-1">This email was sent in your invitation.</p>
              </div>
              <div className="mb-4 w-full min-w-0">
                <label htmlFor="onboard-phone" className="form-label">
                  Phone <span className="text-defaulttextcolor/60 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2 items-center w-full min-w-0">
                  <select
                    id="onboard-country"
                    aria-label="Country code"
                    className="form-control !w-[7.5rem] shrink-0 !min-w-0 !rounded-md"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    {COUNTRY_PHONE_RULES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.dialCode ? `${r.dialCode} ${r.name}` : r.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-defaulttextcolor/70 text-sm shrink-0 hidden sm:inline">→</span>
                  <input
                    id="onboard-phone"
                    type="tel"
                    aria-label="Phone number"
                    className="form-control flex-1 min-w-[7rem] w-0 !rounded-md"
                    placeholder="e.g. 9876543210"
                    value={phoneNational}
                    onChange={(e) => setPhoneNational(e.target.value)}
                    autoComplete="tel-national"
                    inputMode="tel"
                    maxLength={getCountryRuleByCode(countryCode).code === "OTHER" ? 18 : getCountryRuleByCode(countryCode).maxLength + 4}
                  />
                </div>
                <p className="text-[0.75rem] text-defaulttextcolor/60 mt-1">
                  {getCountryRuleByCode(countryCode).name}: {getCountryRuleByCode(countryCode).placeholder}
                </p>
              </div>
              <div className="mb-4">
                <label htmlFor="onboard-password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="onboard-password"
                    type={showPassword ? "text" : "password"}
                    className="form-control pe-10"
                    placeholder="Min 8 characters, at least 1 letter and 1 number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={showPassword ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <label htmlFor="onboard-confirm" className="form-label">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="onboard-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control pe-10"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    <i className={showConfirmPassword ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                  </button>
                </div>
              </div>
              <button type="submit" className="ti-btn ti-btn-primary w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
            <p className="text-center text-sm text-defaulttextcolor/60 dark:text-white/50 mt-6">
              Already have an account?{" "}
              <Link href={ROUTES.signIn} className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
