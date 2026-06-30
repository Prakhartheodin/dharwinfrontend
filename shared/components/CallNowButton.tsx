"use client";

import { useState } from "react";
import Dialpad from "@/app/(components)/(contentlayout)/communication/calling/_components/Dialpad";
import { useModalBehavior } from "@/shared/hooks/useModalBehavior";

// Bare 10-digit → India (+91), matching CallButton / backend normalizePhone.
// The dialer field stays editable so a wrong guess can be corrected.
function toE164(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (t.startsWith("+")) return `+${t.slice(1).replace(/\D/g, "")}`;
  const digits = t.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return `+${digits}`;
}

/**
 * Inline click-to-call overlay. Embeds the full dialer, so both call modes are
 * available without leaving the page: "Browser" (WebRTC softphone — talk through
 * the browser) and "My phone" (bridge — rings your phone first, then connects).
 * The caller-ID (business number) picker lives inside the dialer.
 */
function CallOverlay({
  isOpen,
  onClose,
  defaultTo,
  name,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultTo: string;
  name?: string;
}) {
  const { containerRef, backdropProps } = useModalBehavior({ isOpen, onClose });
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Call ${name || defaultTo}`}
      {...backdropProps}
    >
      <div
        ref={containerRef}
        className="my-8 w-full max-w-md overflow-hidden rounded-2xl bg-bodybg shadow-2xl dark:bg-bodybg2"
      >
        <div className="flex items-center gap-3 border-b border-defaultborder/70 px-5 py-3 dark:border-white/10">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
            <i className="ri-phone-line text-lg" />
          </span>
          <p className="mb-0 truncate text-sm font-semibold text-defaulttextcolor dark:text-white">
            Call {name || "contact"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ms-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-defaulttextcolor/60 transition-colors hover:bg-black/[0.04] hover:text-danger dark:text-white/60 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-4">
          {/* Dialpad carries both modes (Browser / My phone) + caller-ID select.
              Bridge mode is terminal (call rings your phone), so close shortly
              after it's placed; browser mode never fires this (live in-overlay call). */}
          <Dialpad
            defaultTo={defaultTo}
            embedded
            onCallPlaced={() => window.setTimeout(onClose, 2200)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Action-row call button: opens the inline call overlay (browser + phone modes).
 * Drop into any table actions cell; pass `className` to match that table's
 * icon-button style.
 */
export default function CallNowButton({
  phone,
  name,
  className = "",
  title = "Call",
}: {
  phone?: string | null;
  name?: string;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const e164 = toE164(phone || "");
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ||
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-500/10"
        }
        title={title}
        aria-label={name ? `Call ${name}` : "Call"}
      >
        <i className="ri-phone-line text-[1rem]" />
      </button>
      <CallOverlay isOpen={open} onClose={() => setOpen(false)} defaultTo={e164} name={name} />
    </>
  );
}
