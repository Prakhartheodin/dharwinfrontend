"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const MEETING_CHAT_EMOJI_OPTIONS = [
  "👍",
  "❤️",
  "😂",
  "🎉",
  "👏",
  "🙏",
  "🔥",
  "✨",
  "😊",
  "👋",
  "🤔",
  "💯",
];
const EMOJI_COLS = 6;

function chunkEmojis(emojis: string[], cols: number): string[][] {
  const rows: string[][] = [];
  for (let i = 0; i < emojis.length; i += cols) {
    rows.push(emojis.slice(i, i + cols));
  }
  return rows;
}

export function MeetingChatEmojiPicker({
  open,
  disabled,
  inputRef,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  disabled?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onOpenChange: (open: boolean) => void;
  onInsert: (emoji: string) => void;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const emojiRows = useMemo(
    () => chunkEmojis(MEETING_CHAT_EMOJI_OPTIONS, EMOJI_COLS),
    []
  );

  useEffect(() => {
    if (!open) return;
    setFocusIndex(0);
    const t = setTimeout(() => cellRefs.current[0]?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target) || btnRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onOpenChange]);

  const focusEmojiAt = (index: number) => {
    const clamped = Math.max(
      0,
      Math.min(index, MEETING_CHAT_EMOJI_OPTIONS.length - 1)
    );
    setFocusIndex(clamped);
    cellRefs.current[clamped]?.focus();
  };

  const handlePickerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const len = MEETING_CHAT_EMOJI_OPTIONS.length;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusEmojiAt(focusIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusEmojiAt(focusIndex - 1);
        break;
      case "ArrowDown":
        event.preventDefault();
        focusEmojiAt(Math.min(focusIndex + EMOJI_COLS, len - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        focusEmojiAt(Math.max(focusIndex - EMOJI_COLS, 0));
        break;
      case "Home":
        event.preventDefault();
        focusEmojiAt(0);
        break;
      case "End":
        event.preventDefault();
        focusEmojiAt(len - 1);
        break;
      case "Escape":
        event.preventDefault();
        onOpenChange(false);
        btnRef.current?.focus();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onInsert(MEETING_CHAT_EMOJI_OPTIONS[focusIndex]);
        break;
      default:
        break;
    }
  };

  const insertEmoji = (emoji: string) => {
    onInsert(emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="meeting-chat-composer">
      {open && (
        <div
          ref={pickerRef}
          className="meeting-emoji-picker"
          role="grid"
          aria-label="Emoji picker"
          onKeyDown={handlePickerKeyDown}
        >
          {emojiRows.map((row, rowIdx) => (
            <div key={rowIdx} role="row" className="meeting-emoji-picker-row">
              {row.map((emoji, colIdx) => {
                const globalIndex = rowIdx * EMOJI_COLS + colIdx;
                return (
                  <button
                    key={`${emoji}-${globalIndex}`}
                    type="button"
                    role="gridcell"
                    tabIndex={globalIndex === focusIndex ? 0 : -1}
                    aria-label={`Insert ${emoji}`}
                    ref={(el) => {
                      cellRefs.current[globalIndex] = el;
                    }}
                    onClick={() => insertEmoji(emoji)}
                    onFocus={() => setFocusIndex(globalIndex)}
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
        ref={btnRef}
        type="button"
        className="meeting-emoji-btn"
        aria-label={open ? "Close emoji picker" : "Open emoji picker"}
        aria-expanded={open}
        aria-haspopup="grid"
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
      >
        <i className="ri-emotion-happy-line" aria-hidden="true" />
      </button>
      <div className="meeting-chat-form-input-wrap">
        <input
          ref={inputRef}
          className="lk-chat-form-input meeting-chat-form-input"
          disabled={disabled}
          type="text"
          placeholder="Enter a message..."
          aria-label="Chat message"
          onInput={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => ev.stopPropagation()}
          onKeyUp={(ev) => ev.stopPropagation()}
        />
      </div>
    </div>
  );
}

