"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { AxiosError } from "axios";
import Swal from "sweetalert2";
import { consumeCandidateResignedRedirect } from "@/shared/lib/api/client";
import { AuthPageLayout } from "@/shared/components/auth-page-layout";
import { AuthFormCard } from "@/shared/components/auth-form-card";
import { getSafePostLoginPath } from "@/shared/lib/jobReferralRef";

const RESIGNED_POPUP = {
  title: "Cannot sign in",
  text: "You have resigned and cannot sign in. Please contact an administrator for more information.",
};

function isCandidateResignedResponse(err: unknown): boolean {
  if (!(err instanceof AxiosError) || !err.response?.data) return false;
  const d = err.response.data as { errorCode?: string; code?: string };
  if (d.errorCode === "CANDIDATE_RESIGNED") return true;
  if (d.code === "CANDIDATE_RESIGNED") return true;
  return false;
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const postLoginPath = getSafePostLoginPath(searchParams.get("next"));
  const registeredMessage =
    searchParams.get("registered") === "1"
      ? searchParams.get("message") ??
        "Registration successful. You can sign in once an administrator activates your account."
      : null;
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();

  useEffect(() => {
    if (consumeCandidateResignedRedirect()) {
      void Swal.fire({
        icon: "info",
        title: RESIGNED_POPUP.title,
        text: RESIGNED_POPUP.text,
        confirmButtonText: "OK",
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    try {
      await login(email.trim(), password, { redirectTo: postLoginPath });
    } catch (err) {
      if (isCandidateResignedResponse(err)) {
        void Swal.fire({
          icon: "info",
          title: RESIGNED_POPUP.title,
          text: RESIGNED_POPUP.text,
          confirmButtonText: "OK",
        });
        return;
      }
      const message =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : "Sign in failed. Please try again.";
      setError(message);
    }
  };

  return (
    <Fragment>
      <Seo title="Sign In" />
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
                  Login to your account
                </h1>
              </div>

              {registeredMessage && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: 396,
                    padding: "12px 16px",
                    background: "#e8f5e9",
                    border: "1px solid #c8e6c9",
                    color: "#2e7d32",
                    borderRadius: 8,
                    fontSize: 14,
                    lineHeight: "150%",
                  }}
                >
                  {registeredMessage}
                </div>
              )}

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
                  }}
                >
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
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
                  {/* Frame 26: Email - gap 12px */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <label htmlFor="signin-email" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}>
                      Email
                    </label>
                    <input
                    type="email"
                    id="signin-email"
                    placeholder="baiamia@gmail.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    autoComplete="email"
                    required
                    className="w-full max-w-full"
                    style={{
                      height: 48,
                      padding: "12px 16px",
                      border: "3px solid #D1E9FF",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#344054",
                      outline: "none",
                      fontFamily: "'Poppins', sans-serif",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#D1E9FF"; }}
                  />
                  </div>

                  {/* Frame 28: Password - gap 12px */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <label htmlFor="signin-password" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}>
                        Password
                      </label>
                      <Link href={ROUTES.resetPassword} style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#34B34C", textDecoration: "none", textTransform: "capitalize" }}>
                        Forgot ?
                      </Link>
                    </div>
                    <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="signin-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      autoComplete="current-password"
                      required
                      className="w-full max-w-full"
                      style={{
                        height: 48,
                        padding: "12px 48px 12px 16px",
                        border: "1px solid #D0D5DD",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 400,
                        color: "#344054",
                        outline: "none",
                        fontFamily: "'Poppins', sans-serif",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#D0D5DD"; }}
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
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        {showPassword ? (
                          <>
                            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 2L22 22" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" />
                          </>
                        )}
                      </svg>
                    </button>
                    </div>
                  </div>
                </div>

                {/* Frame 30: Button + Sign up - gap 24px */}
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
                  disabled={isLoading}
                  className="w-full max-w-full"
                  style={{
                    height: 52,
                    background: "#34B34C",
                    borderRadius: 8,
                    border: "none",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#FCFCFD",
                    fontFamily: "'Poppins', sans-serif",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => { if (!isLoading) (e.target as HTMLElement).style.background = "#2da043"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#34B34C"; }}
                >
                  {isLoading ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Login now"
                  )}
                </button>

                {/* Frame 29: Sign up link */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#98A2B3", textTransform: "capitalize" }}>
                    Don&apos;t Have An Account ?
                  </span>
                  <Link href={ROUTES.register} style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 400, color: "#34B34C", textDecoration: "none", textTransform: "capitalize" }}>
                    Sign Up
                  </Link>
                </div>
                </div>
              </form>
        </AuthFormCard>
      </AuthPageLayout>
    </Fragment>
  );
}
