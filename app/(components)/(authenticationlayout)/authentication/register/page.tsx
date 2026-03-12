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
                      onChange={(e) => { setName(e.target.value); setError(""); }}
                      autoComplete="name"
                      required
                      className="w-full max-w-full"
                      style={{
                        height: 48,
                        padding: "12px 16px",
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
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
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
                        <EyeIcon visible={showPassword} />
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: "#98A2B3", margin: 0 }}>At least 8 characters, 1 letter and 1 number.</p>
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
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                        autoComplete="new-password"
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
                  </div>
                </div>

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
