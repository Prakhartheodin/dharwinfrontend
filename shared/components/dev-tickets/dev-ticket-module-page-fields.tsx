"use client";

import {
  DEV_TICKET_MODULE_GROUPS,
  findDevTicketPage,
  getPagesForDevTicketModule,
  normalizeDevTicketPath,
} from "@/shared/components/dev-tickets/dev-ticket-modules";

type DevTicketModulePageFieldsProps = {
  module: string;
  pageUrl: string;
  onModuleChange: (module: string) => void;
  onPageUrlChange: (pageUrl: string) => void;
  moduleLabel?: string;
  pageLabel?: string;
  selectClassName?: string;
  layout?: "grid" | "stack";
};

export default function DevTicketModulePageFields({
  module,
  pageUrl,
  onModuleChange,
  onPageUrlChange,
  moduleLabel = "Module",
  pageLabel = "Page",
  selectClassName = "form-control",
  layout = "grid",
}: DevTicketModulePageFieldsProps) {
  const pages = module ? getPagesForDevTicketModule(module) : [];
  const matchedPage = module && pageUrl ? findDevTicketPage(module, pageUrl) : undefined;
  const pageSelectValue = matchedPage?.path ?? (module && pageUrl ? pageUrl : "");

  const moduleInCatalog = !module || DEV_TICKET_MODULE_GROUPS.some((g) => g.label === module);

  const wrapperClass =
    layout === "grid" ? "grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2" : "space-y-4";

  return (
    <div className={wrapperClass}>
      <div>
        <label className="form-label">{moduleLabel}</label>
        <select
          className={`${selectClassName} form-control-block`}
          value={module}
          onChange={(e) => {
            onModuleChange(e.target.value);
            onPageUrlChange("");
          }}
        >
          <option value="">Select module</option>
          {!moduleInCatalog && module ? (
            <option value={module}>{module}</option>
          ) : null}
          {DEV_TICKET_MODULE_GROUPS.map((g) => (
            <option key={g.label} value={g.label}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label">{pageLabel}</label>
        <select
          className={`${selectClassName} form-control-block font-mono !text-[0.8125rem]`}
          value={pageSelectValue}
          disabled={!module}
          onChange={(e) => onPageUrlChange(e.target.value)}
        >
          <option value="">{module ? "Select page path" : "Select a module first"}</option>
          {pages.map((p) => (
            <option key={p.path} value={p.path}>
              {normalizeDevTicketPath(p.path)}
            </option>
          ))}
          {module && pageUrl && !matchedPage ? (
            <option value={pageUrl}>{normalizeDevTicketPath(pageUrl) || pageUrl}</option>
          ) : null}
        </select>
      </div>
    </div>
  );
}
