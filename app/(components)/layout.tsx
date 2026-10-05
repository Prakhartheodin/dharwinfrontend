"use client";

// app/(components)/layout.tsx
//
// Route-group layout. Previously rendered a nested <html>/<head>/<body>,
// which is invalid in the App Router (only app/layout.tsx may emit the
// document shell) and was causing hydration warnings + SSR runtime chunk
// corruption on Vercel.
//
// Now: data-* / dir / className / CSS-var theming is hoisted to the live
// DOM by ThemeAttrsApplier (subscribes to Redux post-hydration); document
// shell + iconfont stylesheets + dragula <script> live in app/layout.tsx.
// This file kicks off the LocalStorageBackup theme bootstrap; route children
// always render (see comment below — do not gate on `theme.pageloading`).

import React, { Suspense, useContext, useEffect } from "react";
import { useDispatch } from "react-redux";
import * as switcherdata from "../../shared/data/switcherdata/switcherdata";
import { ThemeChanger } from "@/shared/redux/action";
import { Initialload } from "@/shared/contextapi";
import ThemeAttrsApplier from "./ThemeAttrsApplier";

export default function Layout({ children }: { children: React.ReactNode }) {
  const theme: any = useContext(Initialload);
  const dispatch = useDispatch();
  const pageReady = Boolean(theme?.pageloading);

  useEffect(() => {
    if (typeof window === "undefined" || pageReady || !theme?.setpageloading) return;
    switcherdata.LocalStorageBackup(
      (payload: any) => dispatch(ThemeChanger(payload) as any),
      theme.setpageloading,
    );
  }, [pageReady, dispatch, theme?.setpageloading]);

  // Always render route `children`. Gating them behind `pageloading` left the App
  // Router page slot empty after the flag flipped in production builds (shell
  // chrome hydrated, main content stayed blank).
  return (
    <>
      <ThemeAttrsApplier />
      <Suspense fallback={null}>{children}</Suspense>
    </>
  );
}
