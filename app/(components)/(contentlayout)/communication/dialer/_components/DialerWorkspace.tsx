"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Dialpad from "@/app/(components)/(contentlayout)/communication/calling/_components/Dialpad";
import RecentCallsRail from "./RecentCallsRail";
import CallContextPanel from "./CallContextPanel";
import { callId, callNumber } from "../_lib/recentCalls";
import type { CallRecord } from "@/shared/lib/api/bolna";

type MobileTab = "recent" | "dialer" | "context";

export default function DialerWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"recent" | "missed">("recent");
  const [selected, setSelected] = useState<CallRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("call"));
  const [dialTarget, setDialTarget] = useState<string | undefined>();
  const [mobileTab, setMobileTab] = useState<MobileTab>("dialer");
  const searchRef = useRef<HTMLInputElement>(null);

  const syncUrl = useCallback((id: string | null) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (id) params.set("call", id); else params.delete("call");
    router.replace(`?${params.toString()}`, { scroll: false }); // never jump the page on select
  }, [router, searchParams]);

  const selectCall = useCallback((r: CallRecord) => {
    setSelected(r); setSelectedId(callId(r)); setDialTarget(callNumber(r));
    syncUrl(callId(r)); setMobileTab("context");
  }, [syncUrl]);

  const dialCall = useCallback((r: CallRecord) => {
    setDialTarget(callNumber(r)); setMobileTab("dialer");
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null); setSelectedId(null); syncUrl(null);
  }, [syncUrl]);

  // Keyboard: "/" focus search, "Esc" clear selection. Ignore "/" while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection]);

  const railProps = {
    activeView: view, onViewChange: setView, selectedCallId: selectedId,
    onSelectCall: selectCall, onDialCall: dialCall, searchRef,
  };

  return (
    <div className="h-[calc(100dvh-9rem)]">
      {/* Mobile tabs (<lg) */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-defaultborder/70 p-1 lg:hidden">
        {(["recent", "dialer", "context"] as MobileTab[]).map((t) => (
          <button key={t} type="button" onClick={() => setMobileTab(t)}
            className={`rounded-md py-1.5 text-xs font-semibold capitalize ${mobileTab === t ? "bg-primary text-white" : "text-defaulttextcolor/70"}`}>
            {t === "context" ? "Details" : t}
          </button>
        ))}
      </div>

      <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[clamp(280px,20vw,360px)_minmax(0,1fr)] xl:grid-cols-[clamp(280px,20vw,360px)_minmax(560px,820px)_340px]">
        {/* Left rail */}
        <div className={`min-h-0 overflow-hidden rounded-2xl border border-defaultborder/70 bg-white dark:bg-black/10 ${mobileTab === "recent" ? "block" : "hidden"} lg:block`}>
          <RecentCallsRail {...railProps} />
        </div>
        {/* Center dialer */}
        <div className={`min-h-0 overflow-y-auto rounded-2xl border border-defaultborder/70 bg-white p-4 dark:bg-black/10 ${mobileTab === "dialer" ? "block" : "hidden"} lg:block`}>
          <Dialpad dialTarget={dialTarget} />
        </div>
        {/* Right context (xl+, or mobile tab) */}
        <div className={`sticky top-0 min-h-0 overflow-y-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-black/10 ${mobileTab === "context" ? "block" : "hidden"} lg:hidden xl:block`}>
          <CallContextPanel record={selected} onCall={(n) => { setDialTarget(n); setMobileTab("dialer"); }} />
        </div>
      </div>
    </div>
  );
}
