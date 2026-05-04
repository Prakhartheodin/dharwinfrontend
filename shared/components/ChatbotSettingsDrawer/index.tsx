"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  fetchChatbotSettings,
  saveChatbotSettings,
  type ChatbotConfig,
} from "@/shared/lib/api/chatbotSettings";

const KNOWN_PAGES = [
  { label: "Dashboard", path: "/" },
  { label: "Employees", path: "/employees" },
  { label: "Jobs", path: "/jobs" },
  { label: "ATS / Candidates", path: "/ats" },
  { label: "Attendance", path: "/attendance" },
  { label: "Leave Requests", path: "/leave" },
  { label: "Projects", path: "/projects" },
  { label: "Tasks", path: "/tasks" },
  { label: "Meetings", path: "/meetings" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function Toggle({
  checked,
  onChange,
  id,
  interactive = true,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  /** When false the Toggle is presentational only — a parent button/click target controls it. */
  interactive?: boolean;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!interactive) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };
  return (
    <span
      id={id}
      role="switch"
      aria-checked={checked}
      tabIndex={interactive ? 0 : -1}
      onClick={interactive ? (e) => { e.stopPropagation(); onChange(!checked); } : undefined}
      onKeyDown={handleKey}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 ${interactive ? "cursor-pointer" : "pointer-events-none"} rounded-full border border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/40 dark:focus:ring-offset-slate-900 ${
        checked
          ? "bg-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
          : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
        style={{ marginTop: "1px" }}
      />
    </span>
  );
}

function DrawerContent({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchChatbotSettings()
      .then((c) => { if (!cancelled) setConfig(c); })
      .catch(() => { if (!cancelled) setConfig({ isGloballyEnabled: true, enabledPages: [] }); });
    return () => { cancelled = true; };
  }, []);

  const isPageEnabled = useCallback(
    (path: string) => {
      if (!config) return true;
      if (config.enabledPages.length === 0) return true;
      return config.enabledPages.includes(path);
    },
    [config]
  );

  const togglePage = (path: string) => {
    if (!config) return;
    const currently = isPageEnabled(path);
    let next: string[];
    if (config.enabledPages.length === 0) {
      // all-enabled → switching one off means explicitly listing everything else
      next = currently
        ? KNOWN_PAGES.map((p) => p.path).filter((p) => p !== path)
        : KNOWN_PAGES.map((p) => p.path);
    } else {
      next = currently
        ? config.enabledPages.filter((p) => p !== path)
        : [...config.enabledPages, path];
    }
    // If all known pages are included, normalise back to [] (all-open)
    const allPaths = KNOWN_PAGES.map((p) => p.path);
    setConfig({ ...config, enabledPages: allPaths.every((p) => next.includes(p)) ? [] : next });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError("");
    try {
      const persisted = await saveChatbotSettings(config);
      setConfig(persisted); // reflect server-normalised state
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.(); // notify parent so FAB visibility refreshes immediately
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : "Failed to save. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
        Loading…
      </div>
    );
  }

  const enabledCount =
    config.enabledPages.length === 0 ? KNOWN_PAGES.length : config.enabledPages.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header — gradient banner */}
      <div className="relative px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700/70 flex-shrink-0 overflow-hidden">
        <div className="absolute inset-x-0 -top-12 h-24 bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 dark:text-white text-base leading-tight">
                Assistant Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Control where Dharwin Assistant appears
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Close settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 min-h-0">
        {/* Master switch — emphasised hero card */}
        <section className="rounded-2xl bg-gradient-to-br from-primary/8 to-primary/[0.02] dark:from-primary/15 dark:to-primary/5 border border-primary/20 p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Enable Chatbot</p>
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
                  config.isGloballyEnabled
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-500/15 text-slate-500"
                }`}
              >
                {config.isGloballyEnabled ? "Active" : "Off"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Master switch. When off the assistant is hidden everywhere — even on enabled pages.
            </p>
          </div>
          <Toggle
            id="global-toggle"
            checked={config.isGloballyEnabled}
            onChange={(v) => setConfig({ ...config, isGloballyEnabled: v })}
          />
        </section>

        {/* Per-page section */}
        <section className={config.isGloballyEnabled ? "" : "opacity-40 pointer-events-none select-none"}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Page Visibility
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {config.enabledPages.length === 0
                  ? "Visible on every page"
                  : `Visible on ${enabledCount} of ${KNOWN_PAGES.length} pages`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setConfig({ ...config, enabledPages: [] })}
                className="px-2 py-1 rounded-md text-primary hover:bg-primary/10 font-medium transition-colors"
              >
                All on
              </button>
              <button
                onClick={() => setConfig({ ...config, enabledPages: KNOWN_PAGES.map((p) => p.path).slice(0, 1) })}
                className="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Custom
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700/70 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {KNOWN_PAGES.map(({ label, path }) => {
              const enabled = isPageEnabled(path);
              return (
                <button
                  type="button"
                  key={path}
                  onClick={() => togglePage(path)}
                  className="w-full flex items-center justify-between gap-3 py-2.5 px-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{label}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">{path}</p>
                  </div>
                  <Toggle
                    id={`page-${path}`}
                    checked={enabled}
                    onChange={() => togglePage(path)}
                    interactive={false}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Helpful footnote */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Settings save to your account and apply across all devices.
        </div>
      </div>

      {/* Sticky footer */}
      <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700/70 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        {error && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:opacity-95 active:scale-[0.98] transition-[opacity,transform] shadow-sm"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function ChatbotSettingsDrawer({ isOpen, onClose, onSaved }: Props) {
  const [mounted, setMounted] = useState(false);
  // Track first-open so DrawerContent (which fetches settings) only mounts on demand.
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (isOpen) setHasOpened(true); }, [isOpen]);

  // ESC closes drawer (in addition to backdrop click)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[11004] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`fixed top-0 left-0 h-full w-[88vw] max-w-sm z-[11005] bg-white dark:bg-gray-900 shadow-[8px_0_30px_-12px_rgba(15,23,42,0.35)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-label="Chatbot settings"
        aria-hidden={!isOpen}
      >
        {hasOpened && <DrawerContent onClose={onClose} onSaved={onSaved} />}
      </div>
    </>,
    document.body
  );
}
