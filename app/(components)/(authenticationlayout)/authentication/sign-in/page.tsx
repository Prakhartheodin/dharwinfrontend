"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Fragment, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { AxiosError } from "axios";

export default function SignInPage() {
  const searchParams = useSearchParams();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    try {
      await login(email.trim(), password);
    } catch (err) {
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
      <div className="min-h-screen relative" style={{ fontFamily: "'Poppins', sans-serif", background: "#FBFBFB" }}>

        {/* LEFT PANEL — photo with gradient overlay + logo */}
        <div
          className="hidden lg:block absolute top-0 left-0 bottom-0 overflow-hidden"
          style={{ width: "50%" }}
        >
          <img
            src="/assets/images/authentication/login-bg.png"
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(299.33deg, #053367 12.79%, #34B34C 101.09%)",
              opacity: 0.75,
            }}
          />
          <div className="relative z-10" style={{ padding: "63px 85px" }}>
            <img
              src="/assets/images/brand-logos/dharwin-white-logo.png"
              alt="Dharwin Business Solutions"
              style={{ height: 73, width: "auto" }}
            />
          </div>
        </div>

        {/* RIGHT DECORATION — geometric shapes */}
        <div className="absolute hidden xl:block" style={{ right: "-80px", top: "50%", transform: "translateY(-50%)", opacity: 0.09, zIndex: 0 }}>
          <div style={{ width: 611, height: 614, background: "#053367" }} />
          <div style={{ position: "absolute", width: 340, height: 343, right: -60, bottom: -60, border: "80px solid #34B34C", borderRadius: 65, boxSizing: "border-box" }} />
        </div>

        {/* CENTERED FORM CARD — absolutely centered on the full page */}
        <div className="relative z-20 min-h-screen flex items-center justify-center">
          <div className="w-full mx-4" style={{ maxWidth: 540 }}>
            <div
              style={{
                background: "#FFFFFF",
                boxShadow: "0px 12px 12.6px rgba(0, 0, 0, 0.1)",
                borderRadius: 20,
                padding: "48px 72px",
              }}
            >
              {/* Title */}
              <div className="text-center" style={{ marginBottom: 54 }}>
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#101828",
                    lineHeight: "100%",
                    margin: 0,
                  }}
                >
                  Login to your account
                </h1>
              </div>

              {registeredMessage && (
                <div
                  style={{
                    marginBottom: 24,
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
                    marginBottom: 24,
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

              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <label
                      htmlFor="signin-email"
                      style={{ fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}
                    >
                      Email
                    </label>
                  </div>
                  <input
                    type="email"
                    id="signin-email"
                    placeholder="baiamia@gmail.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    autoComplete="email"
                    required
                    style={{
                      width: "100%",
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

                {/* Password Field */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <label
                      htmlFor="signin-password"
                      style={{ fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize" }}
                    >
                      Password
                    </label>
                    <Link
                      href={ROUTES.resetPassword}
                      style={{ fontSize: 16, fontWeight: 400, color: "#34B34C", textDecoration: "none", textTransform: "capitalize" }}
                    >
                      Forgot ?
                    </Link>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="signin-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      autoComplete="current-password"
                      required
                      style={{
                        width: "100%",
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

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: "100%",
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
                    marginBottom: 24,
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

                {/* Sign Up Link */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 400, color: "#98A2B3", textTransform: "capitalize" }}>
                    Don&apos;t Have An Account ?{" "}
                  </span>
                  <Link
                    href={ROUTES.register}
                    style={{ fontSize: 16, fontWeight: 400, color: "#34B34C", textDecoration: "none", textTransform: "capitalize" }}
                  >
                    Sign Up
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
