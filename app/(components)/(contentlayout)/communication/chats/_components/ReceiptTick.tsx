"use client";

import React from "react";
import type { TickStatus } from "../_lib/chatReceipts";

const LABEL: Record<TickStatus, string> = { sent: "Sent", delivered: "Delivered", read: "Read" };

/**
 * One tick vocabulary for the thread and the conversation list.
 * sent = single grey check, delivered = grey double, read = primary double.
 * Colour is never the only signal: the icon shape differs for sent vs delivered, and every state
 * carries a title + screen-reader text.
 */
export function ReceiptTick({ status, className = "" }: { status: TickStatus; className?: string }) {
  const icon = status === "sent" ? "ri-check-line" : "ri-check-double-line";
  const tone = status === "read" ? "text-primary" : "text-[#8c9097] dark:text-[#9ca3af]";
  return (
    <span className={`inline-flex items-center leading-none ${className}`} title={LABEL[status]} data-status={status}>
      <i className={`${icon} ${tone}`} aria-hidden="true" />
      <span className="sr-only">{LABEL[status]}</span>
    </span>
  );
}
