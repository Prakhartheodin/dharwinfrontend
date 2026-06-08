"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import type { OrgUnitType } from "@/shared/lib/api/org-structure";

export const ORG_UNIT_TYPE_META: Record<
  OrgUnitType,
  { label: string; className: string; chartColor: string }
> = {
  ceo: {
    label: "CEO",
    className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    chartColor: "#6366f1",
  },
  manager: {
    label: "Manager",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    chartColor: "#0ea5e9",
  },
  supervisor: {
    label: "Supervisor",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    chartColor: "#f59e0b",
  },
  department: {
    label: "Department",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    chartColor: "#22c55e",
  },
};

const btnBase =
  "!mb-0 inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50";

export function OrgPrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`ti-btn ti-btn-primary-full !py-2 !px-4 !text-[0.8125rem] ${btnBase} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function OrgSecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`ti-btn ti-btn-light !py-2 !px-3.5 !text-[0.8125rem] ${btnBase} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type OrgLinkButtonProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
};

export function OrgLinkButton({ href, children, className = "", variant = "primary" }: OrgLinkButtonProps) {
  const variantClass =
    variant === "primary"
      ? "ti-btn ti-btn-primary-full !py-2 !px-4 !text-[0.8125rem]"
      : "ti-btn ti-btn-light !py-2 !px-3.5 !text-[0.8125rem]";
  return (
    <Link href={href} className={`${variantClass} ${btnBase} ${className}`}>
      {children}
    </Link>
  );
}

type TableActionProps = {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "info" | "danger";
  disabled?: boolean;
  title?: string;
};

export function OrgTableAction({ children, onClick, tone = "primary", disabled, title }: TableActionProps) {
  const toneClass = {
    primary: "ti-btn-soft-primary",
    secondary: "ti-btn-soft-secondary",
    info: "ti-btn-soft-info",
    danger: "ti-btn-soft-danger",
  }[tone];
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`ti-btn ti-btn-sm ${toneClass} !py-1.5 !px-2.5 !text-[0.75rem] ${btnBase}`}
    >
      {children}
    </button>
  );
}

export function OrgTypeBadge({ type }: { type: OrgUnitType | string }) {
  const meta = ORG_UNIT_TYPE_META[type as OrgUnitType];
  if (!meta) {
    return (
      <span className="inline-flex items-center rounded-full border border-defaultborder/60 px-2 py-0.5 text-[0.7rem] font-medium capitalize">
        {type}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function OrgChartLegend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-defaultborder/70 bg-light/40 px-3 py-2.5 dark:bg-white/[0.02]">
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/60 me-1">Legend</span>
      {(Object.keys(ORG_UNIT_TYPE_META) as OrgUnitType[]).map((type) => {
        const meta = ORG_UNIT_TYPE_META[type];
        return (
          <span
            key={type}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${meta.className}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.chartColor }} aria-hidden />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

export function OrgLoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-10" role="status" aria-live="polite">
      <div className="ti-spinner text-primary" aria-hidden />
      <p className="mb-0 text-[0.8125rem] text-defaulttextcolor/60">{label}</p>
    </div>
  );
}

type OrgEmptyStateProps = {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function OrgEmptyState({ icon, title, description, action }: OrgEmptyStateProps) {
  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-defaultborder/80 bg-gradient-to-b from-light/50 to-transparent px-6 py-10 text-center dark:from-white/[0.02]">
      <span
        className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden
      >
        <i className={`${icon} text-2xl leading-none`} />
      </span>
      <h6 className="mb-1 text-[0.9375rem] font-semibold text-defaulttextcolor">{title}</h6>
      <p className="mb-0 max-w-md text-[0.8125rem] leading-relaxed text-defaulttextcolor/65">{description}</p>
      {action ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

type OrgPageLayoutProps = {
  seoTitle: string;
  currentpage: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export function OrgPageLayout({ seoTitle, currentpage, subtitle, headerActions, children }: OrgPageLayoutProps) {
  return (
    <>
      <Seo title={seoTitle} />
      <Pageheader currentpage={currentpage} activepage="Organization" mainpage={seoTitle} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="box-header flex flex-col gap-3 border-b border-defaultborder/80 bg-gradient-to-br from-primary/[0.07] via-transparent to-emerald-500/[0.04] px-4 py-4 dark:from-primary/12 dark:to-transparent sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
              <div className="min-w-0">
                <h5 className="box-title mb-1">{seoTitle}</h5>
                {subtitle ? (
                  <p className="mb-0 max-w-2xl text-[0.8125rem] leading-relaxed text-defaulttextcolor/70">{subtitle}</p>
                ) : null}
              </div>
              {headerActions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
              ) : null}
            </div>
            <div className="box-body p-4 sm:p-5">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

type OrgModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  size?: "md" | "lg";
};

export function OrgModal({ open, title, subtitle, onClose, children, footer, size = "md" }: OrgModalProps) {
  if (!open) return null;
  const widthClass = size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div className="ti-modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="org-modal-title">
      <div className={`ti-modal-box ${widthClass} w-full`}>
        <div className="ti-modal-content overflow-hidden">
          <div className="ti-modal-header border-b border-defaultborder/60 bg-light/30 dark:bg-white/[0.02]">
            <div className="min-w-0 pe-3">
              <h6 id="org-modal-title" className="modal-title mb-0">
                {title}
              </h6>
              {subtitle ? (
                <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="hs-dropdown-toggle ti-modal-close-btn shrink-0"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <i className="ri-close-line" aria-hidden />
            </button>
          </div>
          {children}
          <div className="ti-modal-footer flex flex-wrap items-center justify-end gap-2 border-t border-defaultborder/60 bg-light/20 px-4 py-3 dark:bg-white/[0.02]">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrgModalCancelButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <OrgSecondaryButton {...props} />;
}

export function OrgModalSubmitButton({
  saving,
  label = "Save",
  savingLabel = "Saving…",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { saving?: boolean; label?: string; savingLabel?: string }) {
  return (
    <button
      type="submit"
      disabled={saving || props.disabled}
      className={`ti-btn ti-btn-primary-full !min-w-[6.5rem] !py-2 !px-4 !text-[0.8125rem] ${btnBase}`}
      {...props}
    >
      {saving ? (
        <>
          <span className="ti-spinner !h-3.5 !w-3.5" aria-hidden />
          {savingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function OrgFormField({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="form-label mb-2" htmlFor={id}>
        {label}
        {required ? (
          <span className="text-danger ms-0.5" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="mb-0 mt-1.5 text-[0.75rem] text-defaulttextcolor/55">{hint}</p> : null}
    </div>
  );
}
