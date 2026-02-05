"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { AxiosError } from "axios";

const PASSWORD_MIN_LENGTH = 8;

function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
    const code = err.response?.data?.code;
    if (code === 400 && msg) return String(msg);
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
    setLoading(true);
    try {
      const res = await usersApi.publicRegisterUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      router.push(`${ROUTES.signIn}?registered=1&message=${encodeURIComponent(res.message ?? "Registration successful.")}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <Seo title="Register" />
      <div className="grid grid-cols-12 authentication mx-0 text-defaulttextcolor text-defaultsize">
        <div className="xxl:col-span-7 xl:col-span-7 lg:col-span-12 col-span-12 bg-white dark:!bg-bodybg">
          <div className="grid grid-cols-12 items-center h-full ">
            <div className="xxl:col-span-3 xl:col-span-3 lg:col-span-3 md:col-span-3 sm:col-span-2"></div>
            <div className="xxl:col-span-6 xl:col-span-6 lg:col-span-6 md:col-span-6 sm:col-span-8 col-span-12">
              <div className="p-[3rem]">
                <div className="mb-6">
                  <Link
                    aria-label="Dharwin home"
                    href={ROUTES.defaultAfterLogin}
                    className="inline-flex items-center gap-3"
                  >
                    <img
                      src="../../../assets/images/logo.png"
                      alt="Dharwin logo"
                      className="h-8 w-auto"
                    />
                  </Link>
                </div>
                <p className="h5 font-semibold mb-2">Create account</p>
                <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal">
                  No login required. Your account will be pending until an administrator activates it.
                </p>
                <div className="text-center my-[3rem] authentication-barrier">
                  <span>OR</span>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-y-4">
                  {error && (
                    <div className="xl:col-span-12 col-span-12 p-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="xl:col-span-12 col-span-12 mt-0">
                    <label htmlFor="register-name" className="form-label text-default">Full name</label>
                    <input
                      type="text"
                      id="register-name"
                      className="form-control form-control-lg w-full !rounded-md"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(""); }}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="xl:col-span-12 col-span-12">
                    <label htmlFor="register-email" className="form-label text-default">Email</label>
                    <input
                      type="email"
                      id="register-email"
                      className="form-control form-control-lg w-full !rounded-md"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="xl:col-span-12 col-span-12">
                    <label htmlFor="register-password" className="form-label text-default">Password</label>
                    <div className="input-group">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="register-password"
                        className="form-control form-control-lg !border-s !rounded-e-none"
                        placeholder="Min 8 characters, 1 letter and 1 number"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        required
                      />
                      <button aria-label="toggle password" type="button" className="ti-btn ti-btn-light !rounded-s-none !mb-0" onClick={() => setShowPassword(!showPassword)}>
                        <i className={`${showPassword ? "ri-eye-line" : "ri-eye-off-line"} align-middle`}></i>
                      </button>
                    </div>
                    <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-1 mb-0">At least 8 characters, 1 letter and 1 number.</p>
                  </div>
                  <div className="xl:col-span-12 col-span-12">
                    <label htmlFor="register-confirm-password" className="form-label text-default">Confirm password</label>
                    <div className="input-group">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="register-confirm-password"
                        className="form-control form-control-lg !border-s !rounded-e-none"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                        autoComplete="new-password"
                        required
                      />
                      <button aria-label="toggle confirm password" type="button" className="ti-btn ti-btn-light !rounded-s-none !mb-0" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <i className={`${showConfirmPassword ? "ri-eye-line" : "ri-eye-off-line"} align-middle`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-12 col-span-12 grid">
                    <button type="submit" disabled={loading} className="ti-btn ti-btn-lg bg-primary text-white !font-medium dark:border-defaultborder/10">
                      {loading ? "Creating account…" : "Register"}
                    </button>
                  </div>
                  <p className="xl:col-span-12 col-span-12 text-[0.875rem] text-[#8c9097] dark:text-white/50 text-center mt-2 mb-0">
                    Already have an account?{" "}
                    <Link href={ROUTES.signIn} className="text-primary font-medium">Sign in</Link>
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
                <Swiper spaceBetween={30} navigation={true} centeredSlides={true} autoplay={{ delay: 2500, disableOnInteraction: false }} pagination={{ clickable: true }} modules={[Pagination, Autoplay, Navigation]} className="mySwiper">
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img src="../../../assets/images/authentication/2.png" className="authentication-image" alt="" />
                        </div>
                        <h6 className="font-semibold text-[1rem]">Register</h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">Create an account. An administrator will activate it so you can sign in.</p>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img src="../../../assets/images/authentication/3.png" className="authentication-image" alt="" />
                        </div>
                        <h6 className="font-semibold text-[1rem]">Register</h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">Your account will be pending until activated.</p>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img src="../../../assets/images/authentication/2.png" className="authentication-image" alt="" />
                        </div>
                        <h6 className="font-semibold text-[1rem]">Register</h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">After activation, sign in and use the system.</p>
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
