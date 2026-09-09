"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "@livekit/components-styles";
import {
  CameraDisabledIcon,
  CameraIcon,
  ChatCloseIcon,
  ChatIcon,
  LeaveIcon,
  MicDisabledIcon,
  MicIcon,
  ParticipantPlaceholder,
  ScreenShareIcon,
} from "@livekit/components-react";
import { splitTextLinks } from "@/app/(components)/(contentlayout)/communication/chats/_utils/chatHelpers";
import { PREVIEW_MEETING_CSS, PREVIEW_OBSIDIAN_CSS } from "./preview-meeting-styles";
import { MeetingTileHandBadge } from "@/shared/components/livekit/meeting-tile-hand-badge";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "🎉", "👏", "🙏", "🔥", "✨", "😊", "👋", "🤔", "💯"];
const EMOJI_COLS = 6;

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  local: boolean;
  time: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "Priya Sharma",
    text: "Can everyone see the slide deck?",
    local: false,
    time: "10:02",
  },
  {
    id: "2",
    sender: "You",
    text: "Yes, looks good on my end 👍",
    local: true,
    time: "10:03",
  },
  {
    id: "3",
    sender: "James O'Brien With A Very Long Display Name",
    text: "https://example.com/very/long/path/to/some/resource?query=abcdefghijklmnopqrstuvwxyz",
    local: false,
    time: "10:04",
  },
];

const HAND_TOAST_DURATION_MS = 4000;
const HAND_LOWER_TOAST_DURATION_MS = 3000;
const HAND_TOAST_MAX_VISIBLE = 3;
const NARROW_TOOLBAR_BREAKPOINT_PX = 760;

type HandToast = {
  id: string;
  participantId: string;
  message: string;
  durationMs: number;
};

function useNarrowControlBar(breakpointPx = NARROW_TOOLBAR_BREAKPOINT_PX) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  return narrow;
}

function useViewportWidth() {
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return viewportWidth;
}

function formatUnreadCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}

const PARTICIPANTS = [
  { id: "you", name: "You", local: true, speaking: true },
  { id: "priya", name: "Priya Sharma", local: false, speaking: false },
  { id: "alex", name: "Alex Chen", local: false, speaking: false, handRaised: true },
  { id: "maria", name: "Maria Lopez", local: false, speaking: false },
  {
    id: "james",
    name: "James O'Brien With A Very Long Display Name That Should Ellipsize",
    local: false,
    speaking: false,
  },
  { id: "wei", name: "Wei Zhang", local: false, speaking: false },
  { id: "sarah", name: "Sarah Johnson", local: false, speaking: false },
  { id: "omar", name: "Omar Hassan", local: false, speaking: false },
  { id: "lisa", name: "Lisa Park", local: false, speaking: false },
  { id: "david", name: "David Kim", local: false, speaking: false },
];

/** Google-Meet-style column count — mirrored from stable-video-conference.tsx */
function gridColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  return Math.ceil(Math.sqrt(count));
}

function formatTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

function chunkEmojis(emojis: string[], cols: number): string[][] {
  const rows: string[][] = [];
  for (let i = 0; i < emojis.length; i += cols) {
    rows.push(emojis.slice(i, i + cols));
  }
  return rows;
}

function buildInitialHandStates(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const p of PARTICIPANTS) {
    map[p.id] = p.local ? false : Boolean(p.handRaised);
  }
  return map;
}

function handRaiseToastMessage(participant: (typeof PARTICIPANTS)[number]): string {
  if (participant.local) return "You raised your hand";
  return `${participant.name} raised their hand`;
}

function handLowerToastMessage(participant: (typeof PARTICIPANTS)[number]): string {
  if (participant.local) return "You lowered your hand";
  return `${participant.name} lowered their hand`;
}

function PreviewMessageBody({ text }: { text: string }) {
  return (
    <>
      {splitTextLinks(text).map((segment, index) =>
        segment.href ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="preview-chat-link"
          >
            {segment.text}
            <span className="preview-sr-only"> (opens in new window)</span>
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

export default function MeetingFeaturesPreview() {
  const [handStates, setHandStates] = useState(buildInitialHandStates);
  const [handToasts, setHandToasts] = useState<HandToast[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const viewportWidth = useViewportWidth();
  const narrow = useNarrowControlBar();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [offline, setOffline] = useState(false);
  const [simulateSendFailure, setSimulateSendFailure] = useState(false);
  const [sendError, setSendError] = useState("");
  const [emojiFocusIndex, setEmojiFocusIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const emojiCellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const messagesEndRef = useRef<HTMLLIElement>(null);
  const handStatesInitializedRef = useRef(false);
  const prevHandStatesRef = useRef<Record<string, boolean>>(buildInitialHandStates());
  const prevMessageCountRef = useRef(INITIAL_MESSAGES.length);
  const handToastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handRaised = handStates.you ?? false;

  const cols = gridColumns(PARTICIPANTS.length);
  const rows = Math.max(1, Math.ceil(PARTICIPANTS.length / cols));
  const gridStyle: CSSProperties & Record<string, string | number> = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridAutoRows: "minmax(0, 1fr)",
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    flex: 1,
    minHeight: 0,
    height: "100%",
    width: "100%",
    placeItems: "stretch",
    "--lk-col-count": cols,
  };

  const emojiRows = useMemo(() => chunkEmojis(EMOJI_OPTIONS, EMOJI_COLS), []);

  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
      prevMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > prevMessageCountRef.current) {
      setUnreadCount((count) => count + (messages.length - prevMessageCountRef.current));
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, chatOpen]);

  useEffect(() => {
    if (!chatOpen) {
      setEmojiOpen(false);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, [chatOpen]);

  useEffect(() => {
    if (!emojiOpen) return;
    setEmojiFocusIndex(0);
    const t = setTimeout(() => emojiCellRefs.current[0]?.focus(), 0);
    return () => clearTimeout(t);
  }, [emojiOpen]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiBtnRef.current?.contains(target)
      ) {
        return;
      }
      setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [emojiOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (emojiOpen) {
        e.preventDefault();
        setEmojiOpen(false);
        emojiBtnRef.current?.focus();
        return;
      }
      if (chatOpen) {
        e.preventDefault();
        setChatOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [emojiOpen, chatOpen]);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [messages]);

  const enqueueHandToast = useCallback((participantId: string, kind: "raise" | "lower") => {
    const participant = PARTICIPANTS.find((p) => p.id === participantId);
    if (!participant) return;

    const message =
      kind === "raise" ? handRaiseToastMessage(participant) : handLowerToastMessage(participant);
    const durationMs = kind === "raise" ? HAND_TOAST_DURATION_MS : HAND_LOWER_TOAST_DURATION_MS;
    const id = `${participantId}-${kind}-${Date.now()}`;

    setHandToasts((prev) => {
      const withoutSame = prev.filter((toast) => toast.participantId !== participantId);
      return [...withoutSame, { id, participantId, message, durationMs }].slice(
        -HAND_TOAST_MAX_VISIBLE
      );
    });

    const existingTimer = handToastTimersRef.current.get(participantId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      setHandToasts((prev) => prev.filter((toast) => toast.id !== id));
      handToastTimersRef.current.delete(participantId);
    }, durationMs);

    handToastTimersRef.current.set(participantId, timer);
  }, []);

  useEffect(() => {
    if (!handStatesInitializedRef.current) {
      handStatesInitializedRef.current = true;
      prevHandStatesRef.current = { ...handStates };
      return;
    }

    for (const p of PARTICIPANTS) {
      const wasRaised = prevHandStatesRef.current[p.id] ?? false;
      const isRaised = handStates[p.id] ?? false;
      if (!wasRaised && isRaised) {
        enqueueHandToast(p.id, "raise");
      } else if (wasRaised && !isRaised) {
        enqueueHandToast(p.id, "lower");
      }
    }

    prevHandStatesRef.current = { ...handStates };
  }, [handStates, enqueueHandToast]);

  useEffect(() => {
    const timers = handToastTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const hasUnread = !chatOpen && unreadCount > 0;
  const unreadLabel = unreadCount > 9 ? "9+ unread messages" : `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`;
  const chatToggleLabel = chatOpen
    ? "Close chat"
    : hasUnread
      ? `Open chat, ${unreadLabel}`
      : "Open chat";

  const breakpointLabel =
    viewportWidth >= 1440
      ? "Desktop 1440+"
      : viewportWidth >= 1024
        ? "Desktop"
        : viewportWidth >= 760
          ? "Tablet"
          : viewportWidth > 0
            ? "Mobile toolbar"
            : "—";

  const sendMessage = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = draft.trim();
      if (!text) return;

      if (offline) {
        setSendError("You're not connected to the meeting. Rejoin to send messages.");
        return;
      }
      if (simulateSendFailure) {
        setSendError("Failed to send message. Try again.");
        return;
      }

      setSendError("");
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          sender: "You",
          text,
          local: true,
          time: formatTime(),
        },
      ]);
      setDraft("");
      setEmojiOpen(false);
    },
    [draft, offline, simulateSendFailure]
  );

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const toggleHand = () => {
    setHandStates((prev) => ({ ...prev, you: !prev.you }));
  };

  const toggleAlexHand = () => {
    setHandStates((prev) => ({ ...prev, alex: !prev.alex }));
  };

  const simulateRemoteMessage = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `remote-${Date.now()}`,
        sender: "Priya Sharma",
        text: "Quick check — can you see this message?",
        local: false,
        time: formatTime(),
      },
    ]);
  };

  const focusEmojiAt = (index: number) => {
    const clamped = Math.max(0, Math.min(index, EMOJI_OPTIONS.length - 1));
    setEmojiFocusIndex(clamped);
    emojiCellRefs.current[clamped]?.focus();
  };

  const handleEmojiPickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const len = EMOJI_OPTIONS.length;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusEmojiAt(emojiFocusIndex + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusEmojiAt(emojiFocusIndex - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusEmojiAt(Math.min(emojiFocusIndex + EMOJI_COLS, len - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        focusEmojiAt(Math.max(emojiFocusIndex - EMOJI_COLS, 0));
        break;
      case "Home":
        e.preventDefault();
        focusEmojiAt(0);
        break;
      case "End":
        e.preventDefault();
        focusEmojiAt(len - 1);
        break;
      case "Escape":
        e.preventDefault();
        setEmojiOpen(false);
        emojiBtnRef.current?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        insertEmoji(EMOJI_OPTIONS[emojiFocusIndex]);
        break;
      default:
        break;
    }
  };

  const chatFormDisabled = offline;

  return (
    <div className="preview-meeting-shell">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <link rel="stylesheet" href="/assets/iconfonts/RemixIcons/fonts/remixicon.css" />
      <style>{PREVIEW_OBSIDIAN_CSS}</style>
      <style>{PREVIEW_MEETING_CSS}</style>

      <header className="preview-meeting-header">
        <div>
          <h1>Meeting features preview</h1>
          <p>
            Raise hand + chat emoji — isolated mock, no production meeting code changed.
          </p>
        </div>
        <div className="preview-header-actions">
          <div className="preview-demo-controls" role="group" aria-label="Preview demo controls">
            <button
              type="button"
              className="preview-demo-btn"
              aria-pressed={offline}
              onClick={() => {
                setOffline((v) => !v);
                setSendError("");
              }}
            >
              {offline ? "Go online" : "Simulate offline"}
            </button>
            <button
              type="button"
              className="preview-demo-btn"
              aria-pressed={simulateSendFailure}
              onClick={() => {
                setSimulateSendFailure((v) => !v);
                setSendError("");
              }}
            >
              {simulateSendFailure ? "Send OK" : "Simulate send fail"}
            </button>
            <button
              type="button"
              className="preview-demo-btn"
              onClick={() => {
                setMessages([]);
                setSendError("");
              }}
              disabled={messages.length === 0}
            >
              Clear chat
            </button>
            <button
              type="button"
              className="preview-demo-btn"
              aria-pressed={handStates.alex}
              onClick={toggleAlexHand}
            >
              {handStates.alex ? "Lower Alex hand" : "Raise Alex hand"}
            </button>
            <button type="button" className="preview-demo-btn" onClick={simulateRemoteMessage}>
              Simulate remote msg
            </button>
          </div>
          <div className="preview-width-badge" aria-live="polite">
            <span>Viewport</span>
            <strong>{viewportWidth || "—"}px</strong>
            <span>· {breakpointLabel}</span>
          </div>
        </div>
      </header>

      <div className="preview-meeting-stage-wrap" data-narrow={narrow ? "true" : undefined}>
        <div className="room-meeting-container">
          <div
            className="lk-video-conference"
            data-chat-open={chatOpen ? "true" : undefined}
            data-unread={hasUnread ? "true" : undefined}
          >
            <div className="lk-video-conference-inner">
              <div className="lk-grid-layout" style={gridStyle}>
                {PARTICIPANTS.map((p) => {
                  const raised = handStates[p.id] ?? false;
                  const displayName = p.local ? "You" : p.name;
                  const tileLabel = [
                    displayName,
                    raised ? "hand raised" : null,
                    p.speaking ? "speaking" : null,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <div key={p.id} className="lk-cam-tile">
                      <div
                        className="lk-participant-tile"
                        role="group"
                        data-lk-speaking={p.speaking ? "true" : undefined}
                        data-hand-raised={raised ? "true" : undefined}
                        aria-label={tileLabel}
                      >
                        <div className="lk-participant-placeholder">
                          <ParticipantPlaceholder />
                        </div>
                        <div className="lk-participant-metadata">
                          <div className="lk-participant-metadata-item">
                            {raised && <MeetingTileHandBadge />}
                            <span
                              className="lk-participant-name"
                              data-lk-local={p.local ? "true" : undefined}
                              title={displayName}
                            >
                              {displayName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="preview-hand-toast-stack"
                aria-live="polite"
                aria-atomic="false"
                role="status"
              >
                {handToasts.map((toast) => (
                  <div key={toast.id} className="preview-hand-toast">
                    <span className="preview-hand-toast-icon" aria-hidden="true">
                      <i className="ri-hand" />
                    </span>
                    <span className="preview-hand-toast-message">{toast.message}</span>
                  </div>
                ))}
              </div>

              <aside
                className="lk-chat-panel"
                data-open={chatOpen ? "true" : undefined}
                data-offline={offline ? "true" : undefined}
                aria-label="Meeting chat"
                inert={!chatOpen ? true : undefined}
              >
                <div className="lk-chat">
                  <div className="lk-chat-header">
                    <span>Messages</span>
                    <button
                      type="button"
                      className="lk-close-button"
                      aria-label="Close chat"
                      onClick={() => {
                        setChatOpen(false);
                        setEmojiOpen(false);
                      }}
                    >
                      <ChatCloseIcon />
                    </button>
                  </div>

                  <ul
                    className="lk-chat-messages"
                    role="log"
                    aria-label="Chat messages"
                    aria-relevant="additions"
                  >
                    {messages.length === 0 ? (
                      <li className="preview-chat-empty">No messages yet. Say hello!</li>
                    ) : (
                      messages.map((m) => (
                        <li
                          key={m.id}
                          className="lk-chat-entry"
                          data-lk-message-origin={m.local ? "local" : "remote"}
                        >
                          <span className="lk-meta-data">
                            <strong className="lk-participant-name" title={m.sender}>
                              {m.sender}
                            </strong>
                            <span className="lk-timestamp">{m.time}</span>
                          </span>
                          <span className="lk-message-body">
                            <PreviewMessageBody text={m.text} />
                          </span>
                        </li>
                      ))
                    )}
                    <li ref={messagesEndRef} className="preview-chat-scroll-anchor" aria-hidden="true" />
                  </ul>

                  {offline && (
                    <p className="lk-chat-offline" role="status">
                      You&apos;re not connected to the meeting. Rejoin to send messages.
                    </p>
                  )}

                  <form className="lk-chat-form preview-chat-form" onSubmit={sendMessage}>
                    <div className="preview-chat-composer">
                      {emojiOpen && (
                        <div
                          ref={emojiPickerRef}
                          className="preview-emoji-picker"
                          role="grid"
                          aria-label="Emoji picker"
                          onKeyDown={handleEmojiPickerKeyDown}
                        >
                          {emojiRows.map((row, rowIdx) => (
                            <div key={rowIdx} role="row" className="preview-emoji-picker-row">
                              {row.map((emoji, colIdx) => {
                                const globalIndex = rowIdx * EMOJI_COLS + colIdx;
                                return (
                                  <button
                                    key={`${emoji}-${globalIndex}`}
                                    type="button"
                                    role="gridcell"
                                    tabIndex={globalIndex === emojiFocusIndex ? 0 : -1}
                                    aria-label={`Insert ${emoji}`}
                                    ref={(el) => {
                                      emojiCellRefs.current[globalIndex] = el;
                                    }}
                                    onClick={() => insertEmoji(emoji)}
                                    onFocus={() => setEmojiFocusIndex(globalIndex)}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        ref={emojiBtnRef}
                        type="button"
                        className="preview-emoji-btn"
                        aria-label={emojiOpen ? "Close emoji picker" : "Open emoji picker"}
                        aria-expanded={emojiOpen}
                        aria-haspopup="grid"
                        onClick={() => setEmojiOpen((v) => !v)}
                        disabled={chatFormDisabled}
                      >
                        <i className="ri-emotion-happy-line" aria-hidden="true" />
                      </button>
                      <div className="preview-chat-form-input-wrap">
                        <input
                          ref={inputRef}
                          type="text"
                          className="lk-chat-form-input preview-chat-form-input"
                          placeholder="Enter a message..."
                          value={draft}
                          onChange={(e) => {
                            setDraft(e.target.value);
                            if (sendError) setSendError("");
                          }}
                          aria-label="Chat message"
                          disabled={chatFormDisabled}
                          aria-invalid={sendError ? true : undefined}
                          aria-describedby={sendError ? "preview-chat-send-error" : undefined}
                        />
                      </div>
                    </div>
                    {sendError && (
                      <p id="preview-chat-send-error" className="preview-chat-send-error" role="alert">
                        {sendError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="lk-button lk-chat-form-button"
                      disabled={!draft.trim() || chatFormDisabled}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </aside>
            </div>

            <div className="lk-control-bar" role="toolbar" aria-label="Meeting controls">
              <div className="lk-button-group">
                <button
                  type="button"
                  className="lk-button"
                  aria-pressed={!micOn}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  onClick={() => setMicOn((v) => !v)}
                >
                  {micOn ? <MicIcon /> : <MicDisabledIcon />}
                  {!narrow && <span>Microphone</span>}
                </button>
              </div>
              <div className="lk-button-group">
                <button
                  type="button"
                  className="lk-button"
                  aria-pressed={!camOn}
                  aria-label={camOn ? "Turn off camera" : "Turn on camera"}
                  onClick={() => setCamOn((v) => !v)}
                >
                  {camOn ? <CameraIcon /> : <CameraDisabledIcon />}
                  {!narrow && <span>Camera</span>}
                </button>
              </div>
              <button type="button" className="lk-button" aria-label="Share screen">
                <ScreenShareIcon />
                {!narrow && <span>Share screen</span>}
              </button>
              <button
                type="button"
                className="lk-button preview-raise-hand-btn"
                aria-pressed={handRaised}
                aria-label={handRaised ? "Lower hand" : "Raise hand"}
                onClick={toggleHand}
              >
                {/* RemixIcon ri-hand — matches demo HTML; LiveKit control bar uses SVG icons elsewhere */}
                <i className="ri-hand" aria-hidden="true" />
                {!narrow && <span>{handRaised ? "Lower hand" : "Raise hand"}</span>}
              </button>
              <div id="chat-button-slot">
                <button
                  type="button"
                  className="lk-button"
                  aria-pressed={chatOpen}
                  aria-label={chatToggleLabel}
                  onClick={() => setChatOpen((v) => !v)}
                >
                  <ChatIcon />
                  {!narrow && <span>Chat</span>}
                  {hasUnread && unreadCount > 1 && (
                    <span className="preview-chat-unread-badge" aria-hidden="true">
                      {formatUnreadCount(unreadCount)}
                    </span>
                  )}
                </button>
              </div>
              <button
                type="button"
                className="lk-button lk-disconnect-button"
                aria-label="Leave meeting"
              >
                <LeaveIcon />
                {!narrow && <span>Leave</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="preview-hint-bar">
        Resize the browser to test responsive toolbar (breakpoint 760px). Close chat and use Simulate remote msg to
        test the unread badge. Toggle raise/lower hand for toast + screen reader announcements. Grid adapts to{" "}
        {PARTICIPANTS.length} participants ({cols}×{rows}).
      </p>
    </div>
  );
}
