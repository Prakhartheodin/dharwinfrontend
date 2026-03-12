"use client";

import React, { type ReactNode } from "react";

/** Form card wrapper matching Dharwin design: 540px, padding 48px 72px, gap 54px */
export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col justify-center items-center w-full"
      style={{
        width: "100%",
        maxWidth: 540,
        minHeight: 500,
        padding: "clamp(24px, 5vw, 48px) clamp(24px, 8vw, 72px)",
        gap: 54,
        background: "#FFFFFF",
        boxShadow: "0px 12px 12.6px rgba(0, 0, 0, 0.1)",
        borderRadius: 20,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {children}
    </div>
  );
}
