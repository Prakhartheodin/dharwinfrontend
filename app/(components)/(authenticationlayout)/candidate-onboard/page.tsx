"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { AxiosError } from "axios";
import Swal from "sweetalert2";
import {
  getPhoneValidationError,
  getPhoneCountry,
  formatPhoneForApi,
  DEFAULT_PHONE_COUNTRY,
} from "@/shared/lib/phoneCountries";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;

function decryptBase64(s: string): string {
  try {
    return atob(s || "");
  } catch {
    return "";
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
  }
  return "Registration failed. Please try again.";
}

/**
 * Public candidate onboarding (Dharwrin-style).
 * URL: /candidate-onboard?token=...&adminId=...&email=...&expires=...
 * Creates User (active) + Candidate, returns tokens. User can log in immediately.
 */
export default function CandidateOnboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [adminId, setAdminId] = useState("");
  const [isValidToken, setIsValidToken] = useState(false);
  const [referralRef, setReferralRef] = useState<string | null>(null);

  useEffect(() => {
    const refParam = searchParams.get("ref");
    setReferralRef(refParam && refParam.trim() ? refParam.trim() : null);

    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    const expiresParam = searchParams.get("expires");
    const adminIdParam = searchParams.get("adminId");

    if (!token || !emailParam || !expiresParam) {
      setLinkError("Invalid or missing link parameters. Please use the link from your invitation email.");
      return;
    }
    const expires = parseInt(expiresParam, 10);
    if (Number.isNaN(expires) || Date.now() > expires) {
      setLinkError("This link has expired. Please request a new onboarding link.");
      return;
    }
    if (!token.includes("_") || token.split("_").length !== 3) {
      setLinkError("Invalid token format.");
      return;
    }
    let decodedEmail = "";
    let decodedAdminId = "";
    try {
      decodedEmail = emailParam.includes("@") ? decodeURIComponent(emailParam) : decryptBase64(emailParam);
      decodedAdminId = adminIdParam ? decryptBase64(adminIdParam) : "";
    } catch {
      decodedEmail = emailParam;
    }
    if (!decodedEmail || !decodedEmail.includes("@")) {
      setLinkError("Invalid or missing email in link.");
      return;
    }
    setEmail(decodedEmail);
    setAdminId(decodedAdminId);
    setIsValidToken(true);
  }, [searchParams]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim().toLowerCase();
    const phone = phoneNumber.trim().replace(/\D/g, "");

    if (!fn || fn.length < 2) {
      setError("First name must be at least 2 characters.");
      return;
    }
    if (!ln || ln.length < 2) {
      setError("Last name must be at least 2 characters.");
      return;
    }
    if (!em) {
      setError("Email is required.");
      return;
    }
    if (!phone) {
      setError("Phone number is required.");
      return;
    }
    const phoneError = getPhoneValidationError(phoneNumber, countryCode);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (adminId) {
        const res = await usersApi.registerCandidateFromInvite({
          name: `${fn} ${ln}`,
          email: em,
          password,
          role: "user",
          phoneNumber: phone,
          countryCode,
          adminId,
        });
        await Swal.fire({
          title: "Registration Successful!",
          html: `
            <p class="mb-4">We sent a verification email to <strong>${em}</strong>.</p>
            <div class="text-left bg-gray-50 rounded-lg p-4 text-sm">
              <p class="font-semibold mb-2">Next steps:</p>
              <ul class="list-disc list-inside space-y-1 text-gray-700">
                <li>Open the email and click <strong>Verify</strong></li>
                <li>After verification, your account becomes active — you can sign in right away</li>
                <li>Complete your profile after login</li>
              </ul>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Go to Login",
          confirmButtonColor: "#36af4c",
        });
        router.push(
          `${ROUTES.signIn}?registered=1&message=${encodeURIComponent(
            "Check your email and click the verification link. Once verified, you can sign in — no administrator approval required."
          )}`
        );
      } else {
        const res = await usersApi.publicRegisterCandidate({
          name: `${fn} ${ln}`,
          email: em,
          password,
          phoneNumber: formatPhoneForApi(phone, countryCode),
          countryCode,
          ...(referralRef ? { ref: referralRef } : {}),
        });
        router.push(
          `${ROUTES.signIn}?registered=1&message=${encodeURIComponent(res.message ?? "Registration successful. You can sign in.")}`
        );
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("already taken") || msg.toLowerCase().includes("email")) {
        Swal.fire({
          title: "Account Already Exists",
          html: `
            <p class="mb-4">Welcome back! You already have an account.</p>
            <p class="text-sm text-gray-600 mb-4">${em}</p>
            <p class="text-sm">Click below to log in and access your account.</p>
          `,
          icon: "info",
          confirmButtonText: "Go to Login",
          confirmButtonColor: "#36af4c",
          showCancelButton: true,
          cancelButtonText: "Stay Here",
          cancelButtonColor: "#6b7280",
        }).then((result) => {
          if (result.isConfirmed) router.push(ROUTES.signIn);
        });
      } else {
        setError(msg);
      }
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

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-bodybg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-defaulttextcolor dark:text-white/70">Validating secure access...</p>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <Seo title="Employee onboarding" />
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left: Form */}
        <div className="flex-1 bg-white dark:bg-white/5 flex flex-col justify-between items-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-2xl sm:text-3xl font-bold text-defaulttextcolor dark:text-white mb-2">
              Find better jobs—faster
            </h1>
            <p className="text-defaulttextcolor/80 dark:text-white/70 mb-6">
              Create your account using the email from your invitation.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="form-label">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className="form-control"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    minLength={2}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="form-label">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className="form-control"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    minLength={2}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control bg-gray-100 dark:bg-black/20"
                  value={email}
                  readOnly
                  aria-readonly
                />
                <p className="text-xs text-defaulttextcolor/60 mt-1">This email was sent in your invitation.</p>
              </div>
              <div>
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <div className="flex gap-2">
                  <PhoneCountrySelect
                    id="countryCode"
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <input
                    id="phone"
                    type="tel"
                    className="form-control flex-1"
                    placeholder={getPhoneCountry(countryCode).placeholder}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={getPhoneCountry(countryCode).maxLength}
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="form-label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control pe-10"
                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                    aria-label={showPassword ? "Hide" : "Show"}
                  >
                    <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm" className="form-label">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control pe-10"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                    aria-label={showConfirmPassword ? "Hide" : "Show"}
                  >
                    <i className={showConfirmPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                  </button>
                </div>
              </div>
              <button type="submit" className="ti-btn ti-btn-primary w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
            <p className="text-center text-sm text-defaulttextcolor/60 mt-6">
              Already have an account?{" "}
              <Link href={ROUTES.signIn} className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        {/* Right: Gradient panel (Dharwrin-style) */}
        <div className="flex-1 bg-gradient-to-br from-[#093464] to-[#0a4a7a] p-6 sm:p-8 lg:p-12 flex flex-col justify-between hidden lg:flex">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-white/20 px-4 py-2 rounded-full text-xs font-medium text-white">ALL EXPERIENCE LEVELS</span>
            <span className="bg-white/20 px-4 py-2 rounded-full text-xs font-medium text-white">ALL INDUSTRIES WELCOME</span>
            <span className="bg-white/20 px-4 py-2 rounded-full text-xs font-medium text-white">PRIVATE & SECURE</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Where top talent meets top opportunities.
            </h2>
            <p className="text-blue-100 mb-6">
              Create your profile. See roles. Apply fast.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 p-4 sm:p-6 rounded-xl">
                <div className="text-2xl font-bold text-white">10K+</div>
                <div className="text-sm text-blue-100">Candidates placed</div>
              </div>
              <div className="bg-white/20 p-4 sm:p-6 rounded-xl">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-sm text-blue-100">Companies hiring</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
