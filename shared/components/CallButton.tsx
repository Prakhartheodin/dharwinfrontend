"use client";

import Link from "next/link";

/**
 * Best-effort E.164 for a deep-link param. Bare 10-digit numbers default to
 * India (+91) — matches the backend `normalizePhone`. The dialer field is
 * editable, so the user can correct the country if the guess is wrong.
 */
function toE164(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return `+${digits}`;
}

/**
 * Click-to-call from any profile (Batch C — gap #6). Deep-links to the dialer
 * with the number prefilled; the user picks caller ID + browser/phone there.
 * Renders nothing when there is no phone, so callers can drop it unconditionally.
 */
export default function CallButton({
  phone,
  label = "Call",
  className = "",
  iconOnly = false,
}: {
  phone?: string | null;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const e164 = toE164(phone || "");
  if (!e164) return null;

  return (
    <Link
      href={`/communication/calling?to=${encodeURIComponent(e164)}`}
      title={`Call ${e164}`}
      aria-label={`Call ${e164}`}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-600/20 dark:text-emerald-400"
      }
    >
      <i className="ri-phone-line" />
      {iconOnly ? null : label}
    </Link>
  );
}
