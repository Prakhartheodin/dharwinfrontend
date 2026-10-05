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
import { getChatUiContext } from "@/shared/lib/chatUiContext";
import type { Block } from "@/shared/types/chatResponse";
import {
  fetchChatbotSettings,
  isChatbotEnabledForPage,
  type ChatbotConfig,
} from "@/shared/lib/api/chatbotSettings";
import ChatMessageLazy from "./ChatMessageLazy";
import { ConfirmResolveContext, type ConfirmResolved } from "./renderers/ConfirmBlock";
import { useDraggableFab } from "./useDraggableFab";
import {
  AgentOrb,
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  ConsoleStyles,
  CONTROL,
  EmptyChatState,
  IconButton,
  Kbd,
  LAYOUT,
  MaximizeIcon,
  MinimizeIcon,
  TABLE_PAGE_SIZE,
  TrashIcon,
  TYPE,
} from "./ui";

/** Wide tables / long lists are cramped in the 420px dock — promote to full page. */
function blocksNeedFullscreen(blocks?: Block[]): boolean {
  if (!blocks?.length) return false;
  for (const b of blocks) {
    if (b.type === "table") {
      if ((b.columns?.length ?? 0) >= 4) return true;
      if ((b.rows?.length ?? 0) > TABLE_PAGE_SIZE) return true;
    }
    if (b.type === "cards" && (b.items?.length ?? 0) > 6) return true;
    if (b.type === "group" && blocksNeedFullscreen(b.blocks)) return true;
  }
  return false;
}

function withConfirmResolved(blocks: Block[], key: string, resolved: ConfirmResolved): Block[] {
  return blocks.map((b) => {
    if (b.type === "confirm" && b.key === key) return { ...b, resolved };
    if (b.type === "group") return { ...b, blocks: withConfirmResolved(b.blocks, key, resolved) };
    return b;
  });
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: Block[];
  entityType?: string | null;
  queryId?: string | null;
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
const UNDO_WINDOW_MS = 8000;
/** Within this many px of the bottom counts as "reading the latest". */
const STICK_THRESHOLD_PX = 80;
/** 6 lines x 22px leading + 18px vertical padding. */
const COMPOSER_MAX_HEIGHT_PX = 150;

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
  const [clearedMessages, setClearedMessages] = useState<Message[] | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  // Follow new tokens only while the reader is already at the bottom; if
  // they scrolled up to read, leave them there and offer "Jump to latest".
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const wasLoadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // A settled confirm card is written into its message, and so into the
  // localStorage effect above, so a reload never shows a live Confirm again.
  const resolveConfirm = useCallback((key: string, resolved: ConfirmResolved) => {
    setMessages((prev) =>
      prev.map((m) => (m.blocks?.length ? { ...m, blocks: withConfirmResolved(m.blocks, key, resolved) } : m))
    );
  }, []);

  // Instant, not smooth: a smooth scroll per token fired a new animation on
  // every chunk, and its intermediate scroll events read as "user scrolled
  // up", which would wrongly unstick the thread.
  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickRef.current = true;
    setShowJump(false);
  }, []);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
    stickRef.current = nearBottom;
    if (nearBottom) setShowJump(false);
    setScrolled(el.scrollTop > 0);
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    if (stickRef.current) scrollToBottom();
    else setShowJump(true);
  }, [messages, isOpen, scrollToBottom]);

  // Screen readers hear one line when a reply finishes, never per token.
  useEffect(() => {
    if (isLoading) {
      setAnnouncement("");
    } else if (wasLoadingRef.current) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && last.content) setAnnouncement("Dharwin replied.");
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, messages]);

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
    ta.style.height = `${Math.min(ta.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
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

  // Clearing wipes localStorage AND the server-side conversation, and the
  // trash icon sits next to Expand/Close. It used to be one irreversible
  // click. Hold the thread in memory for UNDO_WINDOW_MS so a misclick is
  // recoverable; the server call is deferred until that window closes.
  const clearHistory = () => {
    if (messages.length === 0) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setClearedMessages(messages);
    setMessages([]);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    undoTimerRef.current = setTimeout(() => {
      setClearedMessages(null);
      undoTimerRef.current = null;
      void clearChatConversation();
    }, UNDO_WINDOW_MS);
  };

  const undoClear = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    if (clearedMessages) setMessages(clearedMessages);
    setClearedMessages(null);
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    stickRef.current = true; // sending always brings the thread to the bottom
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
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    blocks: env.blocks ?? [],
                    entityType: env.meta?.entityType ?? env.meta?.kind ?? null,
                    queryId: env.meta?.queryId ?? null,
                  }
                : m
            )
          );
          if (env.blocks && env.blocks.length > 0 && blocksNeedFullscreen(env.blocks)) {
            setViewMode((v) => (v === "widget" ? "fullscreen" : v));
          }
        },
        getChatUiContext()
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

  const isWorking = isPreparing || isStreaming;
  const statusLabel = isPreparing ? "Thinking…" : isStreaming ? "Writing…" : "Ready";

  const fab = useDraggableFab({
    storageKey: fabPosKey,
    fabSize: FAB_SIZE,
    margin: FAB_MARGIN,
    onClick: () => setViewMode((v) => (v === "closed" ? "widget" : "closed")),
  });

  return (
    <ConfirmResolveContext.Provider value={resolveConfirm}>
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
          "agent-console fixed top-0 right-0 z-[11000] flex flex-col overflow-hidden",
          "bg-white dark:bg-slate-950",
          "border-l border-slate-200 dark:border-slate-800",
          "shadow-[-12px_0_40px_-14px_rgba(15,23,42,0.18)] dark:shadow-[-12px_0_40px_-14px_rgba(0,0,0,0.7)]",
          "transition-[transform,width] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          // Full page = near-viewport slide-over (left gutter keeps backdrop dismissible).
          isFullscreen
            ? "h-screen w-[min(100vw,calc(100vw-1.25rem))] sm:w-[min(100vw,calc(100vw-2.5rem))] max-w-none"
            : "h-screen w-[94vw] max-w-[420px]",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-label="Dharwin Assistant"
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: true } : {})}
      >
        {/* Header. The bottom edge only appears once the thread is scrolled
            under it; at rest the header and thread read as one surface. */}
        <div
          className={`relative z-10 flex flex-shrink-0 items-center justify-between gap-2 border-b bg-white px-3 py-2.5 transition-colors duration-150 dark:bg-slate-950 ${
            scrolled ? "border-slate-200 dark:border-slate-800" : "border-transparent"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AgentOrb size="md" pulse={isWorking} />
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-5 text-slate-900 dark:text-slate-50">Dharwin</span>
              <span className={`block ${TYPE.meta}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="flex items-center">
            {/* Always rendered, disabled when there is nothing to clear, so
                the window controls never jump sideways. Clearing is
                recoverable: the thread is held for UNDO_WINDOW_MS with an
                inline Undo above the composer. */}
            <IconButton
              onClick={clearHistory}
              label="Clear conversation"
              disabled={messages.length === 0 || isLoading}
              tabIndex={isOpen ? undefined : -1}
            >
              <TrashIcon />
            </IconButton>
            <span aria-hidden className="mx-1.5 h-5 w-px bg-slate-200 dark:bg-slate-800" />
            <IconButton
              onClick={() => setViewMode(isFullscreen ? "widget" : "fullscreen")}
              label={isFullscreen ? "Exit full screen" : "Full screen"}
              tabIndex={isOpen ? undefined : -1}
            >
              {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </IconButton>
            <IconButton onClick={() => setViewMode("closed")} label="Close" tabIndex={isOpen ? undefined : -1}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        {/* Messages. Fullscreen is one centered 48rem reading column; the
            composer below uses the same column so both share a left edge. */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div
            ref={listRef}
            onScroll={onListScroll}
            /* The scrollbar (8px) must not shift the thread against the
               composer, which has none. Reserve its space: on both edges in
               fullscreen so the centered column shares the composer's
               center, and on the right only in the dock, where pr-2 + 8px
               gutter = the composer's px-4. */
            className={`agent-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${
              isFullscreen ? "[scrollbar-gutter:stable_both-edges]" : "[scrollbar-gutter:stable]"
            }`}
          >
            <div className={isFullscreen ? `${LAYOUT.column} ${LAYOUT.gutter} py-8` : "py-4 pl-4 pr-2"}>
              {messages.length === 0 && (
                <EmptyChatState
                  fullscreen={isFullscreen}
                  onPick={(q) => handleSend(q)}
                  disabled={isLoading}
                  suggestions={SUGGESTED_QUESTIONS}
                />
              )}

              <div className="flex flex-col gap-5">
                {isOpen &&
                  messages.map((msg, i) => {
                    const isLast = i === messages.length - 1;
                    const status =
                      msg.role === "assistant" && isLast && isLoading
                        ? msg.content === "" ? "pending" : "streaming"
                        : "done";
                    return (
                      <ChatMessageLazy
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        fullscreen={isFullscreen}
                        blocks={msg.blocks}
                        entityType={msg.entityType}
                        queryId={msg.queryId}
                        onAction={(text) => handleSend(text)}
                        status={status}
                        showAuthor={messages[i - 1]?.role !== "assistant"}
                      />
                    );
                  })}
              </div>
            </div>
          </div>

          {showJump && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <button
                type="button"
                onClick={scrollToBottom}
                className={`pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${CONTROL.focus}`}
                style={{ animation: "agent-rise 200ms cubic-bezier(0.16,1,0.3,1)" }}
              >
                <ArrowDownIcon className="h-3.5 w-3.5" />
                Jump to latest
              </button>
            </div>
          )}

          <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
        </div>

        {/* Composer */}
        <div className="relative z-10 flex-shrink-0 bg-white pb-3 pt-2 dark:bg-slate-950">
          <div className={`${isFullscreen ? LAYOUT.column : ""} ${LAYOUT.gutter}`}>
            {clearedMessages && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span>Conversation cleared.</span>
                <button
                  type="button"
                  onClick={undoClear}
                  className="rounded font-semibold text-violet-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-violet-300"
                >
                  Undo
                </button>
              </div>
            )}
            {/* Composer box. `items-end` pins the button to the last line as
                the textarea grows. Both are 40px tall, so a single-line
                composer reads as one row. Send and Stop share a radius and a
                footprint so the control keeps its shape mid-stream. */}
            <div className="flex items-end gap-1.5 rounded-xl border border-slate-300 bg-white p-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-violet-500/25 dark:border-slate-700 dark:bg-slate-900">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Message Dharwin"
                placeholder="Ask Dharwin…"
                rows={1}
                enterKeyHint="send"
                /* Stays enabled while a reply streams so focus is not lost
                   and the next question can be drafted; handleSend ignores
                   Enter until the reply finishes.

                   `border-0 focus:ring-0` is load-bearing: @tailwindcss/forms
                   puts a 1px border + focus ring on every bare <textarea> in
                   the base layer, which drew a second rectangle inside the
                   composer box. The box owns the frame; the field is bare.

                   py + leading = 40px, matching the button. max-h mirrors
                   COMPOSER_MAX_HEIGHT_PX, which the auto-resize effect writes
                   inline. */
                className="min-h-10 max-h-[150px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-[9px] text-[13px] leading-[22px] text-slate-900 outline-none placeholder:text-slate-500 focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus-visible:ring-offset-slate-900"
                  aria-label="Stop generating"
                  title="Stop generating"
                >
                  <span aria-hidden className="block h-3 w-3 rounded-sm bg-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  /* Disabled keeps a visible glyph (slate-500 on slate-200)
                     instead of white-on-grey, which vanished. */
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors duration-150 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:focus-visible:ring-offset-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                  aria-label="Send"
                  title="Send"
                >
                  <ArrowUpIcon />
                </button>
              )}
            </div>
            {/* One quiet line in the 420px dock; keyboard hints only have
                room (and an audience) in fullscreen. */}
            <div className={`mt-2 flex items-center justify-between gap-3 px-1 ${TYPE.meta}`}>
              <span>AI replies may be inaccurate. Verify before acting.</span>
              {isFullscreen && (
                <span className="hidden flex-shrink-0 items-center gap-1 sm:inline-flex">
                  <Kbd>Enter</Kbd>
                  <span>send</span>
                  <span aria-hidden className="mx-0.5">·</span>
                  <Kbd>Shift</Kbd>
                  <Kbd>Enter</Kbd>
                  <span>new line</span>
                </span>
              )}
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
          "agent-fab z-[11001] select-none touch-manipulation",
          "h-14 w-14 rounded-full text-white",
          "relative overflow-visible",
          "transition-[transform,opacity] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isOpen ? "pointer-events-none scale-75 opacity-0" : "scale-100 opacity-100",
          fab.isDragging ? "cursor-grabbing scale-110" : "cursor-grab hover:scale-105 active:scale-95",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary shadow-[0_8px_24px_-8px_rgb(132_90_223_/_0.6)]"
        />
        <span className="relative flex h-full w-full items-center justify-center">
          <svg className="h-6 w-6 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </span>
      </button>
    </ConfirmResolveContext.Provider>
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
