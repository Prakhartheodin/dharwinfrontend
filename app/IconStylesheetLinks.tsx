import { BLOCKING_ICON_STYLESHEETS } from "@/shared/lib/iconStylesheetPaths";

/**
 * Tabler + Remix icon CSS (~215KB blocking). `ti-*` / `ri-*` must paint on first load
 * (sidebar chrome, ATS tables). Other packs: DeferredStylesheets or OnDemandStylesheet.
 */
export const ICON_STYLESHEET_HREFS = BLOCKING_ICON_STYLESHEETS;

export default function IconStylesheetLinks() {
  return (
    <>
      {ICON_STYLESHEET_HREFS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  );
}
