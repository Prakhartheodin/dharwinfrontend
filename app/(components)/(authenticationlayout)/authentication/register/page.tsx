"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { AxiosError } from "axios";

const PASSWORD_MIN_LENGTH = 8;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) { setError("Full name is required."); return; }
    if (!trimmedEmail) { setError("Email is required."); return; }
    if (password.length < PASSWORD_MIN_LENGTH) { setError("Password must be at least 8 characters."); return; }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) { setError("Password must contain at least 1 letter and 1 number."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await usersApi.publicRegisterUser({ name: trimmedName, email: trimmedEmail, password });
      router.push(`${ROUTES.signIn}?registered=1&message=${encodeURIComponent(res.message ?? "Registration successful.")}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
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

  const inputBase: React.CSSProperties = {
    width: "100%",
    height: 48,
    padding: "12px 16px",
    border: "1px solid #D0D5DD",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 400,
    color: "#344054",
    outline: "none",
    fontFamily: "'Poppins', sans-serif",
    boxSizing: "border-box" as const,
  };

  return (
    <Fragment>
      <Seo title="Register" />
      <div className="min-h-screen relative" style={{ fontFamily: "'Poppins', sans-serif", background: "#FBFBFB" }}>

        {/* LEFT PANEL — photo with gradient overlay + logo */}
        <div className="hidden lg:block absolute top-0 left-0 bottom-0 overflow-hidden" style={{ width: "50%" }}>
          <img
            src="/assets/images/authentication/login-bg.png"
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(299.33deg, #053367 12.79%, #34B34C 101.09%)", opacity: 0.75 }}
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

        {/* CENTERED FORM CARD */}
        <div className="relative z-20 min-h-screen flex items-center justify-center">
          <div className="w-full mx-4" style={{ maxWidth: 540 }}>
            <div style={{ background: "#FFFFFF", boxShadow: "0px 12px 12.6px rgba(0, 0, 0, 0.1)", borderRadius: 20, padding: "40px 72px" }}>

              {/* Title */}
              <div className="text-center" style={{ marginBottom: 36 }}>
                <h1 style={{ fontSize: 28, fontWeight: 600, color: "#101828", lineHeight: "100%", margin: 0 }}>
                  Create your account
                </h1>
                <p style={{ fontSize: 14, color: "#5A5A5D", marginTop: 12 }}>
                  Your account will be pending until an administrator activates it.
                </p>
              </div>

              {error && (
                <div style={{ marginBottom: 20, padding: "12px 16px", background: "#fdecea", border: "1px solid #f5c6cb", color: "#c62828", borderRadius: 8, fontSize: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="register-name" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                    Full Name
                  </label>
                  <input
                    type="text" id="register-name" placeholder="Jane Doe"
                    value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
                    autoComplete="name" required
                    style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#D0D5DD"; }}
                  />
                </div>

                {/* Email */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="register-email" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                    Email
                  </label>
                  <input
                    type="email" id="register-email" placeholder="you@example.com"
                    value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    autoComplete="email" required
                    style={{ ...inputBase, border: "3px solid #D1E9FF" }}
                    onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#D1E9FF"; }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="register-password" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"} id="register-password" placeholder="Min 8 characters"
                      value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required
                      style={{ ...inputBase, paddingRight: 48 }}
                      onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#D0D5DD"; }}
                    />
                    <button type="button" aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: "#98A2B3", marginTop: 6 }}>At least 8 characters, 1 letter and 1 number.</p>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: 28 }}>
                  <label htmlFor="register-confirm" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"} id="register-confirm" placeholder="Re-enter password"
                      value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      autoComplete="new-password" required
                      style={{ ...inputBase, paddingRight: 48 }}
                      onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#D0D5DD"; }}
                    />
                    <button type="button" aria-label="toggle confirm password visibility" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                      <EyeIcon visible={showConfirmPassword} />
                    </button>
                  </div>
                </div>

                {/* Register Button */}
                <button
                  type="submit" disabled={loading}
                  style={{
                    width: "100%", height: 52, background: "#34B34C", borderRadius: 8, border: "none",
                    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 600, color: "#FCFCFD", fontFamily: "'Poppins', sans-serif",
                    transition: "background 0.2s", marginBottom: 24,
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

                {/* Sign In Link */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 400, color: "#98A2B3", textTransform: "capitalize" }}>
                    Already Have An Account ?{" "}
                  </span>
                  <Link href={ROUTES.signIn} style={{ fontSize: 16, fontWeight: 400, color: "#34B34C", textDecoration: "none", textTransform: "capitalize" }}>
                    Sign In
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
