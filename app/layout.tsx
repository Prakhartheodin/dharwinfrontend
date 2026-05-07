// uat.dharwin.frontend/app/layout.tsx
//
// Server component. Renders the document shell (<html>/<head>/<body>) and
// hands off to the client-only provider tree in app/providers.tsx. Nothing
// in this file may use "use client", browser globals, or React hooks.
//
// Why server: keeping this layout server-side stops Redux + socket.io-
// client + Firebase + auth-context from being pulled into the SSR runtime
// chunk graph. Those modules only ever run in the browser; with this
// split they only ship in the client bundle, which was the root cause of
// the `[root-of-the-server]__<hash>.js MODULE_NOT_FOUND` errors that
// were stranding chunks outside the Vercel function bundle.
//
// HARD RULE — only this file may render <html>/<head>/<body>. Nested
// layouts (e.g. app/(components)/layout.tsx) MUST NOT re-emit them; doing
// so produces hydration warnings + SSR runtime corruption. Dynamic theme
// data-* attributes are mutated post-hydration by
// app/(components)/ThemeAttrsApplier.tsx.

import "./globals.scss";
import type { Metadata } from "next";
import Script from "next/script";
import Providers from "./providers";
import PrelineScript from "./PrelineScript";

const ICON_STYLESHEETS = [
  "/assets/iconfonts/RemixIcons/fonts/remixicon.css",
  "/assets/iconfonts/tabler-icons/iconfont/tabler-icons.css",
  "/assets/iconfonts/feather/feather.css",
  "/assets/iconfonts/bootstrap-icons/icons/font/bootstrap-icons.css",
  "/assets/iconfonts/line-awesome/1.3.0/css/line-awesome.css",
  "/assets/iconfonts/boxicons/css/boxicons.css",
] as const;

export const metadata: Metadata = {
  icons: { icon: "/assets/images/icon.png" },
  keywords: [
    "nextjs app router",
    "nextjs template",
    "tailwind nextjs",
    "next js themes",
    "next js tailwind",
    "tailwind",
    "admin",
    "tailwindcss nextjs",
    "nextjs admin templates",
    "tailwind admin template",
    "nextjs admin template",
    "nextjs typescript",
    "admin template",
    "tailwind dashboard",
    "tailwind css dashboard",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {ICON_STYLESHEETS.map((path) => (
          <link key={path} rel="stylesheet" href={path} />
        ))}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.css"
        />
      </head>
      {/* Browser extensions (e.g. Grammarly: data-gr-ext-installed) mutate
          <body> before React hydrates; suppressHydrationWarning here keeps
          the warning scoped to the body node only. */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <PrelineScript />
        <Script
          src="https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
