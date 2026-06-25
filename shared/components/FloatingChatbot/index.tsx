"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  streamChatMessage,
  ChatbotRequestError,
  clearChatConversation,
  type ChatMessage as ChatMsg,
  type ChatResponse,
} from "@/shared/lib/api/chatAssistant";
import type { Block } from "@/shared/types/chatResponse";
import {
  fetchChatbotSettings,
  isChatbotEnabledForPage,
  type ChatbotConfig,
} from "@/shared/lib/api/chatbotSettings";
import ChatMessage from "./ChatMessage";
import { useDraggableFab } from "./useDraggableFab";
import {
  AgentOrb,
  ConsoleStyles,
  EmptyChatState,
  IconButton,
  Kbd,
  ReasoningIndicator,
} from "./ui";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: Block[];
}

type ViewMode = "closed" | "widget" | "fullscreen";

const MAX_STORED_MESSAGES = 20;
const FAB_SIZE = 56;
const FAB_MARGIN = 20;
const SIDEBAR_WIDTH = 420;
/**
 * Only push the body content when the viewport is wide enough that
 * shrinking by SIDEBAR_WIDTH still leaves a usable canvas for content
 * (taskboard columns, chat rails, etc.). Below this width, the panel
 * overlays instead of pushing — preventing the taskboard-overlap bug
 * where a narrow remaining canvas (e.g. 1024px - 420px = 604px) was
 * too tight for the 5-column kanban grid + filters.
 */
const SIDEBAR_PUSH_BREAKPOINT = 1280;
const SIDEBAR_TRANSITION_MS = 320;

const SUGGESTED_QUESTIONS = [
  { q: "How many employees do we have?", k: "PEOPLE" },
  { q: "List all open job positions", k: "JOBS" },
  { q: "Who is on leave today?", k: "LEAVE" },
  { q: "Show pending job applications", k: "ATS" },
  { q: "What are today's holidays?", k: "CAL" },
  { q: "List all active projects", k: "PROJ" },
];

function FloatingChatbotInner({ userId }: { userId: string }) {
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

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      /* ignore quota */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setViewMode((v) => (v === "fullscreen" ? "widget" : "closed"));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

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
    void clearChatConversation();
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
        controller.signal,
        (env: ChatResponse) => {
          if (env.blocks && env.blocks.length > 0) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, blocks: env.blocks } : m))
            );
          }
        }
      );
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === "AbortError";
      if (aborted) {
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && m.content === "")));
      } else {
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
  const isStreaming = isLoading && lastMsg?.role === "assistant" && lastMsg.content !== "";

  const statusLabel = isPreparing ? "Reasoning" : isStreaming ? "Streaming" : "Online";

  const fab = useDraggableFab({
    storageKey: fabPosKey,
    fabSize: FAB_SIZE,
    margin: FAB_MARGIN,
    onClick: () => setViewMode((v) => (v === "closed" ? "widget" : "closed")),
  });

  return (
    <>
      <ConsoleStyles />

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[10995] bg-slate-950/50 backdrop-blur-md transition-opacity duration-300 ${
          isFullscreen
            ? "opacity-100 pointer-events-auto"
            : viewMode === "widget"
              ? "opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none"
              : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setViewMode(isFullscreen ? "widget" : "closed")}
        aria-hidden
      />

      {/* Agent console */}
      <div
        className={[
          "fixed top-0 right-0 z-[11000] flex flex-col overflow-hidden",
          "bg-white dark:bg-slate-950",
          "border-l border-slate-200/70 dark:border-slate-800/80",
          "shadow-[-12px_0_40px_-14px_rgba(15,23,42,0.28)] dark:shadow-[-12px_0_40px_-14px_rgba(0,0,0,0.7)]",
          "transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          isFullscreen ? "w-screen h-screen" : "h-screen w-[94vw] max-w-[420px]",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-label="Dharwin Agent Console"
        aria-hidden={!isOpen}
      >
        <div className="agent-grid-bg pointer-events-none absolute inset-0 opacity-60 dark:opacity-100" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-50"
          style={{
            background:
              "radial-gradient(800px 400px at 100% -10%, rgba(132,90,223,0.18), transparent 60%), radial-gradient(600px 380px at -10% 110%, rgba(34,211,238,0.12), transparent 65%)",
          }}
          aria-hidden
        />

        {/* Header */}
        <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 bg-white/70 px-3.5 py-3 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/60">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-cyan-400/60" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-[2px] overflow-hidden">
            <span
              className="block h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
              style={{ animation: "agent-shimmer 4.5s linear infinite" }}
            />
          </span>

          <div className="flex min-w-0 items-center gap-3">
            <AgentOrb size="md" pulse={isPreparing || isStreaming} />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Dharwin Agent</span>
                <span className="rounded-md border border-primary/25 bg-primary/[0.08] px-1 py-px font-mono text-[8.5px] uppercase tracking-[0.2em] text-primary/80">v1</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`relative h-1.5 w-1.5 rounded-full ${isPreparing || isStreaming ? "bg-cyan-400" : "bg-emerald-400"}`}>
                  <span className={`absolute inset-0 rounded-full ${isPreparing || isStreaming ? "bg-cyan-400" : "bg-emerald-400"} animate-ping opacity-60`} />
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {statusLabel}
                </span>
                {(isPreparing || isStreaming) && (
                  <span className="ml-1 inline-flex h-[3px] w-12 origin-left overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800">
                    <span
                      className="block h-full w-full bg-gradient-to-r from-primary via-purple-400 to-cyan-400"
                      style={{ animation: "agent-bar 1.4s ease-in-out infinite" }}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-0.5">
            {messages.length > 0 && !isLoading && (
              <IconButton onClick={clearHistory} label="Clear conversation">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </IconButton>
            )}
            <IconButton
              onClick={() => setViewMode(isFullscreen ? "widget" : "fullscreen")}
              label={isFullscreen ? "Collapse" : "Expand to fullscreen"}
            >
              {isFullscreen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V5H5m14 0h-4v4M5 15h4v4m6 0v-4h4" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 4h-4v4M4 16v4h4m12-4v4h-4" />
                </svg>
              )}
            </IconButton>
            <IconButton onClick={() => setViewMode("closed")} label="Close">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Messages */}
        <div className={`agent-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto ${isFullscreen ? "px-3 sm:px-6 md:px-10 lg:px-16 py-6" : "px-3.5 py-4"}`}>
          <div className={isFullscreen ? "mx-auto w-full max-w-7xl" : ""}>
            {messages.length === 0 && (
              <EmptyChatState
                fullscreen={isFullscreen}
                onPick={(q) => handleSend(q)}
                disabled={isLoading}
                suggestions={SUGGESTED_QUESTIONS}
              />
            )}

            {messages.map((msg) =>
              msg.role === "assistant" && msg.content === "" ? null : (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} fullscreen={isFullscreen} blocks={msg.blocks} />
              )
            )}

            {isPreparing && <ReasoningIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className={`relative z-10 flex-shrink-0 border-t border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/70 ${isFullscreen ? "px-4 sm:px-8 md:px-16 py-4" : "px-3 py-3"}`}>
          <div className={isFullscreen ? "mx-auto max-w-3xl" : ""}>
            <div className="group relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/40 via-purple-400/25 to-cyan-400/40 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
                style={{
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1px",
                }}
              />
              <div className="relative flex items-end gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 transition-colors focus-within:border-primary/30 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:focus-within:border-primary/40 dark:focus-within:bg-slate-900">
                <span aria-hidden className="mb-2 ml-0.5 hidden select-none font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70 sm:inline">
                  ›_
                </span>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? "Generating reply…" : "Ask the agent anything…"}
                  rows={1}
                  disabled={isLoading}
                  className="max-h-36 flex-1 resize-none overflow-y-auto bg-transparent px-1.5 py-2 text-[13px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                {isLoading ? (
                  <button
                    onClick={stopStreaming}
                    className="group/btn relative mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_4px_14px_-4px_rgb(244_63_94_/_0.55)] transition-transform hover:bg-rose-600 active:scale-95"
                    aria-label="Stop generating"
                    title="Stop"
                  >
                    <span className="block h-3 w-3 rounded-sm bg-white" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="group/btn relative mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_4px_14px_-4px_rgb(132_90_223_/_0.55)] transition-all hover:shadow-[0_6px_18px_-4px_rgb(132_90_223_/_0.7)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                    aria-label="Send"
                    title="Send"
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent opacity-60" />
                    <svg
                      className="relative h-4 w-4 -translate-x-px translate-y-px transition-transform group-hover/btn:translate-x-0 group-hover/btn:translate-y-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-7 14-2-5-5-2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1.5 truncate">
                <svg className="h-3 w-3 flex-shrink-0 text-amber-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
                <span className="truncate">AI replies may be inaccurate. Verify before acting.</span>
              </span>
              <span className="hidden flex-shrink-0 items-center gap-1 sm:inline-flex">
                <Kbd>Enter</Kbd>
                <span className="opacity-70">send</span>
                <span className="mx-0.5 opacity-30">·</span>
                <Kbd>⇧</Kbd>
                <Kbd>Enter</Kbd>
                <span className="opacity-70">newline</span>
                {!isFullscreen && (
                  <>
                    <span className="mx-0.5 opacity-30">·</span>
                    <Kbd>Esc</Kbd>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating draggable FAB */}
      <button
        ref={fab.fabRef}
        {...fab.handlers}
        style={fab.style}
        aria-label="Open Dharwin Agent"
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        className={[
          "z-[11001] select-none touch-manipulation",
          "h-14 w-14 rounded-full text-white",
          "relative overflow-visible",
          "transition-[transform,opacity] duration-200",
          isOpen ? "pointer-events-none scale-75 opacity-0" : "scale-100 opacity-100",
          fab.isDragging ? "cursor-grabbing scale-110" : "cursor-grab hover:scale-105 active:scale-95",
        ].join(" ")}
      >
        {!fab.isDragging && !isOpen && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-primary/35"
            style={{ animation: "agent-pulse-ring 2.4s ease-out infinite" }}
          />
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(132,90,223,0.85), rgba(34,211,238,0.7), rgba(132,90,223,0.85))",
            animation: "agent-orbit 6s linear infinite",
            WebkitMask: "radial-gradient(circle, transparent 62%, black 63%)",
            mask: "radial-gradient(circle, transparent 62%, black 63%)",
          }}
        />
        <span
          aria-hidden
          className="absolute inset-[3px] rounded-full bg-gradient-to-br from-primary via-purple-500 to-cyan-400 shadow-[0_10px_30px_-8px_rgb(132_90_223_/_0.7)] ring-1 ring-white/15"
        />
        <span aria-hidden className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/30 to-transparent" />
        <span className="relative flex h-full w-full items-center justify-center">
          <svg className="h-6 w-6 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </span>
      </button>
    </>
  );
}

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
