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
//
// Selector contract: subscribe ONLY to the primitive theme fields we read.
// The root reducer is flat (theme keys + ecommercedata co-mingled at root),
// so `useSelector(s => s)` previously fired on every cart/product action
// and re-ran the DOM-mutation effect with a fresh root ref. The shallowEqual
// selector below returns a stable shape; primitive deps in the effect mean
// the DOM is only touched when an attribute actually changes.

import { useEffect } from "react";
import { useSelector, shallowEqual } from "react-redux";

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

type ThemeAttrs = {
  class: string;
  body: string;
  dir: string;
  dataHeaderStyles: string;
  dataVerticalStyle: string;
  dataNavLayout: string;
  dataMenuStyles: string;
  dataToggled: string;
  dataNavStyle: string;
  horStyle: string;
  dataPageStyle: string;
  dataWidth: string;
  dataMenuPosition: string;
  dataHeaderPosition: string;
  iconOverlay: string;
  bgImg: string;
  iconText: string;
  colorPrimaryRgb: string;
  colorPrimary: string;
  darkBg: string;
  bodyBg: string;
  inputBorder: string;
  Light: string;
};

const str = (v: unknown): string => (v == null ? "" : String(v));

const selectThemeAttrs = (s: any): ThemeAttrs => ({
  class: str(s?.class),
  body: str(s?.body),
  dir: str(s?.dir),
  dataHeaderStyles: str(s?.dataHeaderStyles),
  dataVerticalStyle: str(s?.dataVerticalStyle),
  dataNavLayout: str(s?.dataNavLayout),
  dataMenuStyles: str(s?.dataMenuStyles),
  dataToggled: str(s?.dataToggled),
  dataNavStyle: str(s?.dataNavStyle),
  horStyle: str(s?.horStyle),
  dataPageStyle: str(s?.dataPageStyle),
  dataWidth: str(s?.dataWidth),
  dataMenuPosition: str(s?.dataMenuPosition),
  dataHeaderPosition: str(s?.dataHeaderPosition),
  iconOverlay: str(s?.iconOverlay),
  bgImg: str(s?.bgImg),
  iconText: str(s?.iconText),
  colorPrimaryRgb: str(s?.colorPrimaryRgb),
  colorPrimary: str(s?.colorPrimary),
  darkBg: str(s?.darkBg),
  bodyBg: str(s?.bodyBg),
  inputBorder: str(s?.inputBorder),
  Light: str(s?.Light),
});

export default function ThemeAttrsApplier() {
  const t = useSelector(selectThemeAttrs, shallowEqual);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;

    if (t.class !== "") html.className = t.class;
    else html.removeAttribute("class");

    for (const [stateKey, attr] of HTML_DATA_ATTRS) {
      const v = (t as Record<string, string>)[stateKey];
      if (v === "") html.removeAttribute(attr);
      else html.setAttribute(attr, v);
    }

    for (const [stateKey, cssVar] of CSS_VARS) {
      const v = (t as Record<string, string>)[stateKey];
      if (v !== "") html.style.setProperty(cssVar, v);
      else html.style.removeProperty(cssVar);
    }

    if (document.body) {
      document.body.className = t.body;
    }
  }, [
    t.class,
    t.body,
    t.dir,
    t.dataHeaderStyles,
    t.dataVerticalStyle,
    t.dataNavLayout,
    t.dataMenuStyles,
    t.dataToggled,
    t.dataNavStyle,
    t.horStyle,
    t.dataPageStyle,
    t.dataWidth,
    t.dataMenuPosition,
    t.dataHeaderPosition,
    t.iconOverlay,
    t.bgImg,
    t.iconText,
    t.colorPrimaryRgb,
    t.colorPrimary,
    t.darkBg,
    t.bodyBg,
    t.inputBorder,
    t.Light,
  ]);

  return null;
}
