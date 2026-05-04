"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { streamChatMessage, ChatbotRequestError, type ChatMessage as ChatMsg } from "@/shared/lib/api/chatAssistant";
import { fetchChatbotSettings, isChatbotEnabledForPage, type ChatbotConfig } from "@/shared/lib/api/chatbotSettings";
import ChatMessage from "./ChatMessage";
import { useDraggableFab } from "./useDraggableFab";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ViewMode = "closed" | "widget" | "fullscreen";

const MAX_STORED_MESSAGES = 20;
const FAB_SIZE = 56;
const FAB_MARGIN = 20;
const SIDEBAR_WIDTH = 400; // px — desktop sidebar width
const SIDEBAR_PUSH_BREAKPOINT = 768; // viewport ≥ this pushes body content
const SIDEBAR_TRANSITION_MS = 320;

const SUGGESTED_QUESTIONS = [
  "How many employees do we have?",
  "List all open job positions",
  "Who is on leave today?",
  "Show pending job applications",
  "What are today's holidays?",
  "List all active projects",
];

function FloatingChatbotInner({
  userId,
}: {
  userId: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = `dharwin_chat_${userId}`;
  const fabPosKey = `dharwin_chat_fab_pos_${userId}`;

  const isOpen = viewMode !== "closed";
  const isFullscreen = viewMode === "fullscreen";

  // Load history once per user
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        setMessages(parsed.slice(-MAX_STORED_MESSAGES));
      }
    } catch {
      /* ignore corrupt history */
    }
  }, [storageKey]);

  // Persist history on change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      /* ignore quota */
    }
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isOpen]);

  // Cancel in-flight stream when closing
  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  // ESC: fullscreen → widget → closed
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setViewMode((v) => (v === "fullscreen" ? "widget" : "closed"));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  // Push body content to the LEFT when widget is open on desktop (Cursor-style — sidebar on right).
  // Mobile + fullscreen overlay instead of pushing.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;

    const apply = () => {
      const wide = window.innerWidth >= SIDEBAR_PUSH_BREAKPOINT;
      const shouldPush = viewMode === "widget" && wide;
      body.style.transition = `padding-right ${SIDEBAR_TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1)`;
      body.style.paddingRight = shouldPush ? `${SIDEBAR_WIDTH}px` : "";
    };

    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      body.style.paddingRight = "";
      body.style.transition = "";
    };
  }, [viewMode]);

  const clearHistory = () => {
    setMessages([]);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!overrideText) setInput("");
    setIsLoading(true);

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history: ChatMsg[] = nextMessages.map((m) => ({ role: m.role, content: m.content }));
      await streamChatMessage(
        history,
        (token) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m))
          );
        },
        controller.signal
      );
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === "AbortError";
      if (aborted) {
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && m.content === "")));
      } else {
        // ChatbotRequestError carries a user-facing string already tuned to the failure
        // mode (length limit / 401 / 429 / 5xx). Fall back to a soft generic line so the
        // user never sees the raw "Something went wrong" or HTTP status leak.
        const friendly =
          err instanceof ChatbotRequestError
            ? err.userMessage
            : "I couldn't finish that just now. Please try again.";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: friendly } : m))
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMsg = messages[messages.length - 1];
  const isPreparing = isLoading && lastMsg?.role === "assistant" && lastMsg.content === "";

  // Draggable FAB — toggles widget on click, snap-edges on release
  const fab = useDraggableFab({
    storageKey: fabPosKey,
    fabSize: FAB_SIZE,
    margin: FAB_MARGIN,
    onClick: () => setViewMode((v) => (v === "closed" ? "widget" : "closed")),
  });

  return (
    <>
      {/* Mobile + fullscreen backdrop. On desktop widget mode the body shifts instead of dimming. */}
      <div
        className={`fixed inset-0 z-[10995] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          isFullscreen
            ? "opacity-100 pointer-events-auto"
            : viewMode === "widget"
              ? "opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none"
              : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setViewMode(isFullscreen ? "widget" : "closed")}
        aria-hidden
      />

      {/* Chat sidebar — slides in from RIGHT (Cursor agent style). Pushes body content on ≥md. */}
      <div
        className={[
          "fixed top-0 right-0 z-[11000] flex flex-col overflow-hidden",
          "bg-white dark:bg-slate-900",
          "border-l border-slate-200/80 dark:border-slate-700/80",
          "shadow-[-8px_0_30px_-12px_rgba(15,23,42,0.25)]",
          "transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          isFullscreen
            ? "w-screen h-screen"
            : "h-screen w-[92vw] max-w-[400px]",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-label="Dharwin Assistant"
        aria-hidden={!isOpen}
      >
        {/* Header — primary background with soft glass highlight */}
        <div className="relative flex items-center justify-between px-4 py-3 flex-shrink-0 text-white overflow-hidden bg-primary">
          <div className="absolute inset-x-0 -top-16 h-32 bg-white/20 blur-2xl rounded-full pointer-events-none" />

          <div className="flex items-center gap-2.5 min-w-0 relative">
            <div className="relative w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm font-bold ring-1 ring-white/30">
              D
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-primary animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">Dharwin Assistant</div>
              <div className="text-[10px] uppercase tracking-[0.14em] opacity-75 leading-tight">
                {isLoading ? "Thinking…" : "Online"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 relative">
            {messages.length > 0 && !isLoading && (
              <IconButton onClick={clearHistory} label="Clear history">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </IconButton>
            )}
            <IconButton
              onClick={() => setViewMode(isFullscreen ? "widget" : "fullscreen")}
              label={isFullscreen ? "Collapse" : "Expand to fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V5H5m14 0h-4v4M5 15h4v4m6 0v-4h4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 4h-4v4M4 16v4h4m12-4v4h-4" />
                </svg>
              )}
            </IconButton>
            <IconButton onClick={() => setViewMode("closed")} label="Close">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto min-h-0 ${isFullscreen ? "px-3 sm:px-6 md:px-10 lg:px-16 py-6" : "px-3.5 py-3"}`}>
          <div className={isFullscreen ? "w-full max-w-7xl mx-auto" : ""}>
            {messages.length === 0 && (
              <EmptyState fullscreen={isFullscreen} onPick={(q) => handleSend(q)} disabled={isLoading} />
            )}

            {messages.map((msg) =>
              msg.role === "assistant" && msg.content === "" ? null : (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} fullscreen={isFullscreen} />
              )
            )}

            {isPreparing && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input row */}
        <div
          className={`border-t border-slate-200 dark:border-slate-700/70 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur ${
            isFullscreen ? "px-4 sm:px-8 md:px-16 py-4" : "px-3 py-2.5"
          }`}
        >
          <div className={isFullscreen ? "max-w-3xl mx-auto" : ""}>
            <div className="flex items-end gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus-within:border-primary/40 focus-within:bg-white dark:focus-within:bg-slate-800 transition-colors px-2 py-1.5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "Generating reply…" : "Ask anything…  (Shift+Enter = newline)"}
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none text-sm bg-transparent text-slate-900 dark:text-slate-100 px-2 py-1.5 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 max-h-36 overflow-y-auto disabled:opacity-60"
              />
              {isLoading ? (
                <button
                  onClick={stopStreaming}
                  className="p-2.5 rounded-xl bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-95 transition-all flex-shrink-0"
                  aria-label="Stop generating"
                  title="Stop"
                >
                  <span className="block w-3 h-3 bg-white rounded-sm" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
                  aria-label="Send"
                  title="Send"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-7 14-2-5-5-2z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span>AI replies may be inaccurate. Verify before acting.</span>
              {!isFullscreen && <span className="hidden sm:inline opacity-70">ESC to minimise</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Floating draggable FAB — hidden while sidebar is open to avoid overlap */}
      <button
        ref={fab.fabRef}
        {...fab.handlers}
        style={fab.style}
        aria-label="Open assistant"
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        className={[
          "z-[11001] select-none",
          "w-14 h-14 rounded-full text-white",
          "bg-primary",
          "shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6)]",
          "ring-1 ring-white/10",
          "flex items-center justify-center",
          "transition-[transform,box-shadow,opacity] duration-200",
          isOpen ? "opacity-0 scale-75 pointer-events-none" : "opacity-100 scale-100",
          fab.isDragging
            ? "cursor-grabbing scale-110 shadow-[0_18px_40px_-10px_rgba(79,70,229,0.7)]"
            : "cursor-grab hover:scale-105 active:scale-95",
        ].join(" ")}
      >
        {!fab.isDragging && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-40 pointer-events-none" />
        )}
        <span className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </span>
      </button>
    </>
  );
}

// ---------- Sub-components ----------

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors"
    >
      {children}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
        D
      </div>
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function EmptyState({
  fullscreen,
  onPick,
  disabled,
}: {
  fullscreen: boolean;
  onPick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-4 ${
        fullscreen ? "py-16" : "h-full py-6 px-1"
      }`}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center shadow-lg ring-1 ring-white/20">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Ask me anything about Dharwin
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Employees, jobs, attendance, leave, projects &amp; more
        </p>
      </div>
      <div className={`flex flex-wrap justify-center gap-2 ${fullscreen ? "max-w-2xl" : "w-full"}`}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left leading-snug"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Top-level wrapper ----------

export default function FloatingChatbot() {
  const { user, permissions, permissionsLoaded } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reloadConfig = useCallback(() => {
    if (!user) return;
    fetchChatbotSettings()
      .then(setChatbotConfig)
      .catch(() => setChatbotConfig({ isGloballyEnabled: true, enabledPages: [] }));
  }, [user]);

  useEffect(() => {
    reloadConfig();
  }, [reloadConfig]);

  const hasChatbotAccess = permissions.some((p) => {
    if (!p.startsWith("ai.chatbot:")) return false;
    return p.slice("ai.chatbot:".length).split(",").map((s) => s.trim()).includes("view");
  });

  if (!user || !mounted || !permissionsLoaded) return null;
  if (!hasChatbotAccess) return null;
  if (!isChatbotEnabledForPage(pathname ?? "/", chatbotConfig)) return null;

  return createPortal(
    <FloatingChatbotInner userId={String(user.id)} />,
    document.body
  );
}
