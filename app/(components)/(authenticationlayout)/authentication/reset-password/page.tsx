"use client";

import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as authApi from "@/shared/lib/api/auth";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // If token is present, we are on the "set new password" step.
  const token = searchParams.get("token") ?? "";
  const isResetStep = Boolean(token);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer for resend link
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: trimmedEmail });
      const msg =
        "If this email is registered, we’ve sent a link to reset your password.";
      setSuccess(msg);
      setCooldownSeconds(60);
      await Swal.fire("Reset link sent", msg, "success");
    } catch (err) {
      let message = "We could not send a reset link. Please try again later.";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          message = "Please enter a valid email address.";
        } else if (err.response?.data?.message) {
          message = String(err.response.data.message);
        }
      }
      setError(message);
      await Swal.fire("Request failed", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be at least 8 characters long and include at least one letter and one number.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      const msg =
        "Your password has been reset successfully. You can now sign in with your new password.";
      setSuccess(msg);
      await Swal.fire("Password reset", msg, "success");
      router.push(ROUTES.signIn);
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        if (status === 400) {
          setError("Invalid reset link or password does not meet requirements.");
          await Swal.fire(
            "Cannot reset password",
            "Invalid reset link or password does not meet requirements.",
            "error"
          );
        } else if (status === 401) {
          setError("This reset link is invalid or has expired. Please request a new password reset.");
          await Swal.fire(
            "Link invalid or expired",
            "This reset link is invalid or has expired. Please request a new password reset.",
            "error"
          );
        } else if (err.response?.data?.message) {
          const message = String(err.response.data.message);
          setError(message);
          await Swal.fire("Cannot reset password", message, "error");
        } else {
          const message = "We could not reset your password. Please try again later.";
          setError(message);
          await Swal.fire("Cannot reset password", message, "error");
        }
      } else {
        const message = "We could not reset your password. Please try again later.";
        setError(message);
        await Swal.fire("Cannot reset password", message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = isResetStep ? handleResetSubmit : handleForgotSubmit;

  return (
    <Fragment>
      <Seo title={isResetStep ? "Reset Password" : "Forgot Password"} />
      <div className="grid grid-cols-12 authentication mx-0 text-defaulttextcolor text-defaultsize">
        <div className="xxl:col-span-7 xl:col-span-7 lg:col-span-12 col-span-12 bg-white dark:!bg-bodybg">
          <div className="grid grid-cols-12 items-center h-full ">
            <div className="xxl:col-span-3 xl:col-span-3 lg:col-span-3 md:col-span-3 sm:col-span-2"></div>
            <div className="xxl:col-span-6 xl:col-span-6 lg:col-span-6 md:col-span-6 sm:col-span-8 col-span-12">
              <div className="p-[3rem]">
                <div className="mb-4">
                  <Link aria-label="anchor" href={ROUTES.defaultAfterLogin}>
                    <img
                      src="../../../assets/images/brand-logos/desktop-logo.png"
                      alt=""
                      className="authentication-brand desktop-logo"
                    />
                    <img
                      src="../../../assets/images/brand-logos/desktop-dark.png"
                      alt=""
                      className="authentication-brand desktop-dark"
                    />
                  </Link>
                </div>
                <p className="h5 font-semibold mb-2">
                  {isResetStep ? "Create New Password" : "Forgot Password"}
                </p>
                <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal">
                  {isResetStep
                    ? "Enter a strong new password for your account."
                    : "Enter the email address associated with your account and we’ll send you a link to reset your password."}
                </p>

                <form
                  onSubmit={onSubmit}
                  className="grid grid-cols-12 gap-y-4"
                >
                  {error && (
                    <div className="xl:col-span-12 col-span-12 p-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="xl:col-span-12 col-span-12 p-4 bg-success/10 border border-success/30 text-success rounded-md text-sm">
                      {success}
                    </div>
                  )}

                  {!isResetStep && (
                    <div className="xl:col-span-12 col-span-12 mt-0">
                      <label
                        htmlFor="forgot-email"
                        className="form-label text-default"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="forgot-email"
                        className="form-control form-control-lg w-full !rounded-md"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                          setSuccess("");
                        }}
                        autoComplete="email"
                        required
                      />
                    </div>
                  )}

                  {isResetStep && (
                    <>
                      <div className="xl:col-span-12 col-span-12">
                        <label
                          htmlFor="reset-password"
                          className="form-label text-default"
                        >
                          New Password
                        </label>
                        <div className="input-group">
                          <input
                            type={passwordVisible ? "text" : "password"}
                            id="reset-password"
                            className="form-control form-control-lg !border-s !rounded-e-none"
                            placeholder="New password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError("");
                              setSuccess("");
                            }}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            aria-label="toggle password"
                            type="button"
                            className="ti-btn ti-btn-light !rounded-s-none !mb-0"
                            onClick={() => setPasswordVisible((v) => !v)}
                          >
                            <i
                              className={`${
                                passwordVisible
                                  ? "ri-eye-line"
                                  : "ri-eye-off-line"
                              } align-middle`}
                            ></i>
                          </button>
                        </div>
                      </div>
                      <div className="xl:col-span-12 col-span-12">
                        <label
                          htmlFor="reset-confirm-password"
                          className="form-label text-default"
                        >
                          Confirm Password
                        </label>
                        <div className="input-group">
                          <input
                            type={confirmPasswordVisible ? "text" : "password"}
                            id="reset-confirm-password"
                            className="form-control form-control-lg !border-s !rounded-e-none"
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setError("");
                              setSuccess("");
                            }}
                            autoComplete="new-password"
                            required
                          />
                          <button
                            aria-label="toggle password"
                            type="button"
                            className="ti-btn ti-btn-light !rounded-s-none !mb-0"
                            onClick={() =>
                              setConfirmPasswordVisible((v) => !v)
                            }
                          >
                            <i
                              className={`${
                                confirmPasswordVisible
                                  ? "ri-eye-line"
                                  : "ri-eye-off-line"
                              } align-middle`}
                            ></i>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="xl:col-span-12 col-span-12 grid gap-2">
                    <button
                      type="submit"
                      disabled={loading || (!isResetStep && cooldownSeconds > 0)}
                      className="ti-btn ti-btn-lg bg-primary text-white !font-medium dark:border-defaultborder/10 disabled:opacity-60"
                    >
                      {isResetStep
                        ? loading
                          ? "Saving password…"
                          : "Save Password"
                        : cooldownSeconds > 0
                        ? `Resend in ${cooldownSeconds}s`
                        : loading
                        ? "Sending link…"
                        : "Send Reset Link"}
                    </button>
                    {!isResetStep && cooldownSeconds > 0 && (
                      <p className="text-[0.8rem] text-defaulttextcolor/70 text-center">
                        You can request another reset link in{" "}
                        <span className="font-semibold">{cooldownSeconds}s</span>.
                      </p>
                    )}
                  </div>

                  <p className="xl:col-span-12 col-span-12 text-[0.875rem] text-[#8c9097] dark:text-white/50 text-center mt-2 mb-0">
                    Remembered your password?{" "}
                    <Link href={ROUTES.signIn} className="text-primary font-medium">
                      Back to Sign In
                    </Link>
                  </p>
                </form>
              </div>
            </div>
            <div className="xxl:col-span-3 xl:col-span-3 lg:col-span-3 md:col-span-3 sm:col-span-2"></div>
          </div>
        </div>

        <div className="xxl:col-span-5 xl:col-span-5 lg:col-span-5 col-span-12 xl:block hidden px-0">
          <div className="authentication-cover">
            <div className="aunthentication-cover-content rounded">
              <div className="swiper keyboard-control">
                <Swiper
                  spaceBetween={30}
                  navigation={true}
                  centeredSlides={true}
                  autoplay={{ delay: 2500, disableOnInteraction: false }}
                  pagination={{ clickable: true }}
                  modules={[Pagination, Autoplay, Navigation]}
                  className="mySwiper"
                >
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img
                            src="../../../assets/images/authentication/2.png"
                            className="authentication-image"
                            alt=""
                          />
                        </div>
                        <h6 className="font-semibold text-[1rem]">
                          Secure Access
                        </h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">
                          Reset your password securely and get back to your
                          work.
                        </p>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img
                            src="../../../assets/images/authentication/3.png"
                            className="authentication-image"
                            alt=""
                          />
                        </div>
                        <h6 className="font-semibold text-[1rem]">
                          Keep Your Account Safe
                        </h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">
                          Use a strong, unique password to protect your data.
                        </p>
                      </div>
                    </div>
                  </SwiperSlide>
                </Swiper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

