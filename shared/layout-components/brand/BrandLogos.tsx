"use client";

import { basePath } from "@/next.config";

type BrandLogosProps = {
  /** "header" uses desktop-logo / toggle-* classes; sidebar prefixes main-logo. */
  variant: "header" | "sidebar";
  /** LCP candidate in chrome (header/sidebar primary visible logo). */
  priority?: boolean;
};

function assetSrc(file: string): string {
  const prefix = process.env.NODE_ENV === "production" ? basePath : "";
  return `${prefix}/assets/images/${file}`;
}

function classFor(variant: BrandLogosProps["variant"], role: string): string {
  return variant === "sidebar" ? `main-logo ${role}` : role;
}

/**
 * Theme-switching brand images shared by header and sidebar.
 * Explicit dimensions + fetch priority help Lighthouse LCP without next/image (imgix loader).
 * Display-sized WebP (~280px wide) replaces full 1000px PNGs in public/assets/images/.
 */
export default function BrandLogos({ variant, priority = false }: BrandLogosProps) {
  // LCP discovery is handled by app/layout.tsx preload + LcpLogoHint; avoid a second fetchPriority=high here.
  const loading = priority ? ("eager" as const) : ("lazy" as const);

  return (
    <>
      <img
        src={assetSrc("logo-140.webp")}
        alt="Dharwin"
        className={classFor(variant, "desktop-logo")}
        width={140}
        height={41}
        decoding="async"
        loading={loading}
      />
      <img
        src={assetSrc("icon.png")}
        alt=""
        className={classFor(variant, "toggle-logo")}
        width={32}
        height={32}
        decoding="async"
        loading="lazy"
      />
      <img
        src={assetSrc("logo-dark-140.webp")}
        alt=""
        className={classFor(variant, "desktop-dark")}
        width={140}
        height={41}
        decoding="async"
        loading="lazy"
      />
      <img
        src={assetSrc("icon.png")}
        alt=""
        className={classFor(variant, "toggle-dark")}
        width={32}
        height={32}
        decoding="async"
        loading="lazy"
      />
      <img
        src={assetSrc("logo-dark-140.webp")}
        alt=""
        className={classFor(variant, "desktop-white")}
        width={140}
        height={41}
        decoding="async"
        loading="lazy"
      />
      <img
        src={assetSrc("icon.png")}
        alt=""
        className={classFor(variant, "toggle-white")}
        width={32}
        height={32}
        decoding="async"
        loading="lazy"
      />
    </>
  );
}
