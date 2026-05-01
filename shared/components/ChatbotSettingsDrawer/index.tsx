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
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function DrawerContent({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChatbotSettings()
      .then(setConfig)
      .catch(() => setConfig({ isGloballyEnabled: true, enabledPages: [] }));
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
      await saveChatbotSettings(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Chatbot Settings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Control where the AI assistant appears</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
        {/* Master switch */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Chatbot</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Master switch — hides for all users when off</p>
          </div>
          <Toggle
            id="global-toggle"
            checked={config.isGloballyEnabled}
            onChange={(v) => setConfig({ ...config, isGloballyEnabled: v })}
          />
        </div>

        {/* Per-page toggles */}
        <div className={config.isGloballyEnabled ? "" : "opacity-40 pointer-events-none select-none"}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Page Visibility
            </p>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setConfig({ ...config, enabledPages: [] })} className="text-primary hover:underline">
                All on
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={() => setConfig({ ...config, isGloballyEnabled: false, enabledPages: [] })}
                className="text-gray-500 hover:underline"
              >
                All off
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {config.enabledPages.length === 0
              ? "Chatbot visible on all pages"
              : `Chatbot visible on ${config.enabledPages.length} page(s)`}
          </p>
          <div className="space-y-1">
            {KNOWN_PAGES.map(({ label, path }) => (
              <div
                key={path}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{label}</p>
                  <p className="text-xs text-gray-400 font-mono">{path}</p>
                </div>
                <Toggle id={`page-${path}`} checked={isPageEnabled(path)} onChange={() => togglePage(path)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function ChatbotSettingsDrawer({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[10998] bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-80 z-[10999] bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <DrawerContent onClose={onClose} />
      </div>
    </>,
    document.body
  );
}
