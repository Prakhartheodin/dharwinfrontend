"use client";

// app/(components)/ThemeAttrsApplier.tsx
//
// Replaces the previous nested <html>/<body> rendered by app/(components)/
// layout.tsx. Root layout (app/layout.tsx) is the ONLY component permitted
// to render <html>/<body>; this component subscribes to the Redux theme
// state and mutates `document.documentElement` + `document.body` after
// hydration so theme switches still propagate to data-* attributes and
// CSS variables — without violating the App Router's single-document-shell
// rule that was producing nested html/body warnings + SSR runtime chunk
// corruption on Vercel.

import { useEffect } from "react";
import { useSelector } from "react-redux";

const HTML_DATA_ATTRS: ReadonlyArray<readonly [string, string]> = [
  ["dir",                "dir"],
  ["dataHeaderStyles",   "data-header-styles"],
  ["dataVerticalStyle",  "data-vertical-style"],
  ["dataNavLayout",      "data-nav-layout"],
  ["dataMenuStyles",     "data-menu-styles"],
  ["dataToggled",        "data-toggled"],
  ["dataNavStyle",       "data-nav-style"],
  ["horStyle",           "hor-style"],
  ["dataPageStyle",      "data-page-style"],
  ["dataWidth",          "data-width"],
  ["dataMenuPosition",   "data-menu-position"],
  ["dataHeaderPosition", "data-header-position"],
  ["iconOverlay",        "data-icon-overlay"],
  ["bgImg",              "bg-img"],
  ["iconText",           "data-icon-text"],
];

const CSS_VARS: ReadonlyArray<readonly [string, string]> = [
  ["colorPrimaryRgb", "--primary-rgb"],
  ["colorPrimary",    "--primary"],
  ["darkBg",          "--dark-bg"],
  ["bodyBg",          "--body-bg"],
  ["inputBorder",     "--input-border"],
  ["Light",           "--light"],
];

export default function ThemeAttrsApplier() {
  const state = useSelector((s: any) => s);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;

    if (state?.class != null) html.className = String(state.class);
    for (const [stateKey, attr] of HTML_DATA_ATTRS) {
      const v = state?.[stateKey];
      if (v == null || v === "") html.removeAttribute(attr);
      else html.setAttribute(attr, String(v));
    }

    for (const [stateKey, cssVar] of CSS_VARS) {
      const v = state?.[stateKey];
      if (v != null && v !== "") html.style.setProperty(cssVar, String(v));
      else html.style.removeProperty(cssVar);
    }

    if (document.body) {
      document.body.className = state?.body ?? "";
    }
  }, [state]);

  return null;
}
