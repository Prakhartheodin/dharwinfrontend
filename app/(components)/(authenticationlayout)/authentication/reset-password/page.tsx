"use client";

import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as authApi from "@/shared/lib/api/auth";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") ?? "";
  const isResetStep = Boolean(token);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError("Email is required."); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: trimmedEmail });
      const msg = "If this email is registered, we've sent a link to reset your password.";
      setSuccess(msg);
      setCooldownSeconds(60);
      await Swal.fire("Reset link sent", msg, "success");
    } catch (err) {
      let message = "We could not send a reset link. Please try again later.";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) message = "Please enter a valid email address.";
        else if (err.response?.data?.message) message = String(err.response.data.message);
      }
      setError(message);
      await Swal.fire("Request failed", message, "error");
    } finally { setLoading(false); }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!password || !confirmPassword) { setError("Please enter and confirm your new password."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be at least 8 characters long and include at least one letter and one number.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      const msg = "Your password has been reset successfully. You can now sign in with your new password.";
      setSuccess(msg);
      await Swal.fire("Password reset", msg, "success");
      router.push(ROUTES.signIn);
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        if (status === 400) {
          setError("Invalid reset link or password does not meet requirements.");
          await Swal.fire("Cannot reset password", "Invalid reset link or password does not meet requirements.", "error");
        } else if (status === 401) {
          setError("This reset link is invalid or has expired. Please request a new password reset.");
          await Swal.fire("Link invalid or expired", "This reset link is invalid or has expired. Please request a new password reset.", "error");
        } else if (err.response?.data?.message) {
          const message = String(err.response.data.message);
          setError(message);
          await Swal.fire("Cannot reset password", message, "error");
        } else {
          setError("We could not reset your password. Please try again later.");
          await Swal.fire("Cannot reset password", "We could not reset your password. Please try again later.", "error");
        }
      } else {
        setError("We could not reset your password. Please try again later.");
        await Swal.fire("Cannot reset password", "We could not reset your password. Please try again later.", "error");
      }
    } finally { setLoading(false); }
  };

  const onSubmit = isResetStep ? handleResetSubmit : handleForgotSubmit;

  const inputBase: React.CSSProperties = {
    width: "100%", height: 48, padding: "12px 16px",
    border: "1px solid #D0D5DD", borderRadius: 8,
    fontSize: 14, fontWeight: 400, color: "#344054",
    outline: "none", fontFamily: "'Poppins', sans-serif",
    boxSizing: "border-box" as const,
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
      <Seo title={isResetStep ? "Reset Password" : "Forgot Password"} />
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
            <div style={{ background: "#FFFFFF", boxShadow: "0px 12px 12.6px rgba(0, 0, 0, 0.1)", borderRadius: 20, padding: "48px 72px" }}>

              {/* Title */}
              <div className="text-center" style={{ marginBottom: 16 }}>
                <h1 style={{ fontSize: 28, fontWeight: 600, color: "#101828", lineHeight: "100%", margin: 0 }}>
                  {isResetStep ? "Create New Password" : "Forgot Password"}
                </h1>
              </div>
              <p style={{ fontSize: 14, color: "#5A5A5D", textAlign: "center", marginBottom: 36 }}>
                {isResetStep
                  ? "Enter a strong new password for your account."
                  : "Enter the email address associated with your account and we'll send you a link to reset your password."}
              </p>

              {error && (
                <div style={{ marginBottom: 20, padding: "12px 16px", background: "#fdecea", border: "1px solid #f5c6cb", color: "#c62828", borderRadius: 8, fontSize: 14 }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ marginBottom: 20, padding: "12px 16px", background: "#e8f5e9", border: "1px solid #c8e6c9", color: "#2e7d32", borderRadius: 8, fontSize: 14 }}>
                  {success}
                </div>
              )}

              <form onSubmit={onSubmit}>
                {/* Forgot step: Email */}
                {!isResetStep && (
                  <div style={{ marginBottom: 24 }}>
                    <label htmlFor="forgot-email" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                      Email
                    </label>
                    <input
                      type="email" id="forgot-email" placeholder="email@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); setSuccess(""); }}
                      autoComplete="email" required
                      style={{ ...inputBase, border: "3px solid #D1E9FF" }}
                      onFocus={(e) => { e.target.style.borderColor = "#34B34C"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#D1E9FF"; }}
                    />
                  </div>
                )}

                {/* Reset step: New Password + Confirm */}
                {isResetStep && (
                  <>
                    <div style={{ marginBottom: 24 }}>
                      <label htmlFor="reset-password" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                        New Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword ? "text" : "password"} id="reset-password" placeholder="New password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(""); setSuccess(""); }}
                          autoComplete="new-password" required
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

                    <div style={{ marginBottom: 28 }}>
                      <label htmlFor="reset-confirm" style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#344054", textTransform: "capitalize", marginBottom: 12 }}>
                        Confirm Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showConfirmPassword ? "text" : "password"} id="reset-confirm" placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); setSuccess(""); }}
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
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || (!isResetStep && cooldownSeconds > 0)}
                  style={{
                    width: "100%", height: 52, background: "#34B34C", borderRadius: 8, border: "none",
                    cursor: (loading || (!isResetStep && cooldownSeconds > 0)) ? "not-allowed" : "pointer",
                    opacity: (loading || (!isResetStep && cooldownSeconds > 0)) ? 0.6 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 600, color: "#FCFCFD", fontFamily: "'Poppins', sans-serif",
                    transition: "background 0.2s", marginBottom: 24,
                  }}
                  onMouseEnter={(e) => { if (!loading) (e.target as HTMLElement).style.background = "#2da043"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#34B34C"; }}
                >
                  {isResetStep
                    ? loading ? "Saving password..." : "Save Password"
                    : cooldownSeconds > 0
                      ? `Resend in ${cooldownSeconds}s`
                      : loading ? "Sending link..." : "Send Reset Link"}
                </button>

                {!isResetStep && cooldownSeconds > 0 && (
                  <p style={{ fontSize: 13, color: "#5A5A5D", textAlign: "center", marginBottom: 16 }}>
                    You can request another reset link in <strong>{cooldownSeconds}s</strong>.
                  </p>
                )}

                {/* Back to Sign In */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 400, color: "#98A2B3", textTransform: "capitalize" }}>
                    Remembered your password ?{" "}
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
