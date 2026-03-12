"use client";

import React, { type ReactNode } from "react";

/** Shared layout for login, register, forgot/reset password. Matches Dharwin design. */
export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative overflow-x-hidden w-full"
      style={{ fontFamily: "'Poppins', sans-serif", background: "#FBFBFB" }}
    >
      {/* LEFT: White panel with logo + decorative shapes (design: left = white) */}
      <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-1/2 max-w-[50vw] overflow-hidden bg-[#FBFBFB]">
        <div className="absolute z-10" style={{ left: 85, top: 63 }}>
          <img
            src="/assets/images/logo.png"
            alt="Dharwin Business Solutions"
            className="select-none"
            style={{ width: 248, height: 73.01, objectFit: "contain" }}
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.onerror = null;
              t.src = "/assets/images/brand-logos/dharwin-white-logo.png";
            }}
          />
        </div>
        {/* Group 1: Decorative shapes per CSS spec */}
        <div
          className="absolute pointer-events-none"
          style={{
            position: "absolute",
            width: 656,
            height: 658.89,
            left: -88,
            top: "calc(50% - 658.89px / 2 + 19.59px)",
            opacity: 0.09,
          }}
        >
          {/* Rectangle 1 (Stroke) */}
          <div
            style={{
              position: "absolute",
              width: 549.07,
              height: 551.96,
              left: -88,
              top: 230.14,
              background: "#053367",
            }}
          />
          {/* Rectangle 2 - green bordered square */}
          <div
            style={{
              position: "absolute",
              width: 395.91,
              height: 398.8,
              left: 172.09,
              top: 490.23,
              boxSizing: "border-box",
              border: "86.696px solid #34B34C",
              borderRadius: 69.3568,
            }}
          />
        </div>
      </div>

      {/* RIGHT: Photo + gradient overlay */}
      <div className="hidden lg:block absolute top-0 right-0 bottom-0 w-1/2 max-w-[50vw] overflow-hidden">
        <img
          src="/assets/images/authentication/login-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(299.33deg, #053367 12.79%, #34B34C 101.09%)",
            opacity: 0.75,
          }}
        />
      </div>

      {/* CENTER: Form card - overlay */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[540px] min-w-0">{children}</div>
      </div>
    </div>
  );
}
