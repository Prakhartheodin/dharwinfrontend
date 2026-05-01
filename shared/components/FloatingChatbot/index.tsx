"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { streamChatMessage, type ChatMessage as ChatMsg } from "@/shared/lib/api/chatAssistant";
import { fetchChatbotSettings, isChatbotEnabledForPage, type ChatbotConfig } from "@/shared/lib/api/chatbotSettings";
import ChatbotSettingsDrawer from "@/shared/components/ChatbotSettingsDrawer";
import ChatMessage from "./ChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MAX_STORED_MESSAGES = 20;

function FloatingChatbotInner({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const storageKey = `dharwin_chat_${userId}`;

  // Phase 4: load persisted history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        setMessages(parsed.slice(-MAX_STORED_MESSAGES));
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, [storageKey]);

  // Phase 4: persist history on every change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      /* ignore storage quota errors */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  const clearHistory = () => {
    setMessages([]);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
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
      if (!aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Something went wrong. Please try again." }
              : m
          )
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

  return (
    <>
      <ChatbotSettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="fixed bottom-6 right-6 z-[11000] flex flex-col items-end">
        {/* Chat panel */}
        <div
          className={`mb-3 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right w-[92vw] md:w-[380px] ${
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto h-[75vh] md:h-[580px]"
              : "opacity-0 scale-95 pointer-events-none h-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold text-sm">Dharwin Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Clear history */}
              {messages.length > 0 && !isLoading && (
                <button
                  onClick={clearHistory}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded"
                  aria-label="Clear chat history"
                  title="Clear history"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              {/* Settings gear */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-white/60 hover:text-white transition-colors p-1 rounded"
                aria-label="Chatbot settings"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1 rounded"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Ask me anything about Dharwin</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">HR policies, ATS, attendance, leave &amp; more</p>
              </div>
            )}

            {messages.map((msg) =>
              msg.role === "assistant" && msg.content === "" ? null : (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              )
            )}

            {isPreparing && (
              <div className="flex justify-start mb-3">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                  D
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 flex items-end gap-2 flex-shrink-0 bg-white dark:bg-gray-900">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send)"
              rows={1}
              className="flex-1 resize-none text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 max-h-28 overflow-y-auto"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
              aria-label="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toggle FAB */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-xl hover:scale-110 active:scale-95 transition-transform duration-200 flex items-center justify-center"
          aria-label={isOpen ? "Close assistant" : "Open assistant"}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </button>
      </div>
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

  useEffect(() => {
    if (!user) return;
    fetchChatbotSettings()
      .then(setChatbotConfig)
      .catch(() => setChatbotConfig({ isGloballyEnabled: true, enabledPages: [] }));
  }, [user]);

  const hasChatbotAccess = permissions.some((p) => {
    if (!p.startsWith("ai.chatbot:")) return false;
    return p.slice("ai.chatbot:".length).split(",").map((s) => s.trim()).includes("view");
  });

  if (!user || !mounted || !permissionsLoaded) return null;
  if (!hasChatbotAccess) return null;
  if (!isChatbotEnabledForPage(pathname ?? "/", chatbotConfig)) return null;

  return createPortal(<FloatingChatbotInner userId={String(user.id)} />, document.body);
}
