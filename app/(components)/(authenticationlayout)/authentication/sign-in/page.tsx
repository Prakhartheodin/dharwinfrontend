"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Fragment, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { AxiosError } from "axios";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const registeredMessage = searchParams.get("registered") === "1" ? searchParams.get("message") ?? "Registration successful. You can sign in once an administrator activates your account." : null;
  const [passwordshow1, setpasswordshow1] = useState(false);
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
                <p className="h5 font-semibold mb-2">Sign In</p>
                <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal">Welcome back</p>
                {registeredMessage && (
                  <div className="xl:col-span-12 col-span-12 p-4 bg-success/10 border border-success/30 text-success rounded-md text-sm mb-4">
                    {registeredMessage}
                  </div>
                )}
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
                    <label htmlFor="signin-email" className="form-label text-default">Email</label>
                    <input
                      type="email"
                      id="signin-email"
                      className="form-control form-control-lg w-full !rounded-md"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="xl:col-span-12 col-span-12">
                    <label htmlFor="signin-password" className="form-label text-default block">
                      Password
                      <Link href={ROUTES.resetPassword} className="ltr:float-right rtl:float-left text-danger">Forgot password?</Link>
                    </label>
                    <div className="input-group">
                      <input
                        type={passwordshow1 ? "text" : "password"}
                        id="signin-password"
                        className="form-control form-control-lg !border-s !rounded-e-none"
                        placeholder="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        autoComplete="current-password"
                        required
                      />
                      <button aria-label="toggle password" type="button" className="ti-btn ti-btn-light !rounded-s-none !mb-0" onClick={() => setpasswordshow1(!passwordshow1)} id="button-addon2">
                        <i className={`${passwordshow1 ? "ri-eye-line" : "ri-eye-off-line"} align-middle`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-12 col-span-12 grid">
                    <button type="submit" disabled={isLoading} className="ti-btn ti-btn-lg bg-primary text-white !font-medium dark:border-defaultborder/10">
                      {isLoading ? "Signing in…" : "Sign In"}
                    </button>
                  </div>
                  <p className="xl:col-span-12 col-span-12 text-[0.875rem] text-[#8c9097] dark:text-white/50 text-center mt-2 mb-0">
                    Don&apos;t have an account?{" "}
                    <Link href={ROUTES.register} className="text-primary font-medium">Register</Link>
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
                        <h6 className="font-semibold text-[1rem]">Sign In</h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img src="../../../assets/images/authentication/3.png" className="authentication-image" alt="" />
                        </div>
                        <h6 className="font-semibold text-[1rem]">Sign In</h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="text-white text-center p-[3rem] flex items-center justify-center">
                      <div>
                        <div className="mb-[3rem]">
                          <img src="../../../assets/images/authentication/2.png" className="authentication-image" alt="" />
                        </div>
                        <h6 className="font-semibold text-[1rem]">Sign In</h6>
                        <p className="font-normal text-[.875rem] opacity-[0.7]">Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
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
