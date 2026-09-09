"use client";

import { type ChatMessage, type ChatOptions } from "@livekit/components-core";
import {
  ChatCloseIcon,
  ChatEntry,
  ChatToggle,
  useChat,
  useMaybeLayoutContext,
  type MessageFormatter,
} from "@livekit/components-react";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { splitTextLinks } from "@/app/(components)/(contentlayout)/communication/chats/_utils/chatHelpers";
import { MeetingChatEmojiPicker } from "./meeting-chat-emoji-picker";

export function meetingChatMessageFormatter(message: string) {
  return splitTextLinks(message).map((segment, index) =>
    segment.href ? (
      <a
        key={index}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer"
        className="meeting-chat-link"
      >
        {segment.text}
        <span className="meeting-sr-only"> (opens in new window)</span>
      </a>
    ) : (
      <span key={index}>{segment.text}</span>
    )
  );
}

export interface MeetingChatProps extends React.HTMLAttributes<HTMLDivElement>, ChatOptions {
  chatOpen?: boolean;
  messageFormatter?: MessageFormatter;
  onEmojiOpenChange?: (open: boolean) => void;
}

export function MeetingChat({
  chatOpen = true,
  messageFormatter = meetingChatMessageFormatter,
  messageDecoder,
  messageEncoder,
  channelTopic,
  onEmojiOpenChange,
  ...props
}: MeetingChatProps) {
  const ulRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null!);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const chatOptions: ChatOptions = useMemo(
    () => ({ messageDecoder, messageEncoder, channelTopic }),
    [messageDecoder, messageEncoder, channelTopic]
  );

  const { chatMessages, send, isSending } = useChat(chatOptions);
  const layoutContext = useMaybeLayoutContext();
  const lastReadMsgAt = useRef<ChatMessage["timestamp"]>(0);

  const setEmojiOpenState = (open: boolean) => {
    setEmojiOpen(open);
    onEmojiOpenChange?.(open);
  };

  useEffect(() => {
    if (!chatOpen) setEmojiOpenState(false);
  }, [chatOpen]);

  useEffect(() => {
    if (!chatOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (emojiOpen) {
        event.preventDefault();
        setEmojiOpenState(false);
        return;
      }
      if (layoutContext?.widget.dispatch) {
        event.preventDefault();
        layoutContext.widget.dispatch({ msg: "toggle_chat" });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [chatOpen, emojiOpen, layoutContext]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (inputRef.current && inputRef.current.value.trim() !== "") {
      await send(inputRef.current.value);
      inputRef.current.value = "";
      inputRef.current.focus();
      setEmojiOpenState(false);
    }
  }

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart ?? inputRef.current.value.length;
    const end = inputRef.current.selectionEnd ?? inputRef.current.value.length;
    const next =
      inputRef.current.value.slice(0, start) +
      emoji +
      inputRef.current.value.slice(end);
    inputRef.current.value = next;
    const caret = start + emoji.length;
    inputRef.current.setSelectionRange(caret, caret);
    inputRef.current.focus();
  };

  useEffect(() => {
    ulRef.current?.scrollTo({ top: ulRef.current.scrollHeight });
  }, [chatMessages]);

  useEffect(() => {
    if (!layoutContext || chatMessages.length === 0) return;

    if (
      layoutContext.widget.state?.showChat &&
      chatMessages.length > 0 &&
      lastReadMsgAt.current !== chatMessages[chatMessages.length - 1]?.timestamp
    ) {
      lastReadMsgAt.current = chatMessages[chatMessages.length - 1]?.timestamp;
      return;
    }

    const unreadMessageCount = chatMessages.filter(
      (msg) =>
        !msg.from?.isLocal &&
        (!lastReadMsgAt.current || msg.timestamp > lastReadMsgAt.current)
    ).length;

    const { widget } = layoutContext;
    if (unreadMessageCount > 0 && widget.state?.unreadMessages !== unreadMessageCount) {
      widget.dispatch?.({ msg: "unread_msg", count: unreadMessageCount });
    }
  }, [chatMessages, layoutContext]);

  return (
    <div {...props} className="lk-chat">
      <div className="lk-chat-header">
        Messages
        {layoutContext && (
          <ChatToggle className="lk-close-button" aria-label="Close chat">
            <ChatCloseIcon />
          </ChatToggle>
        )}
      </div>

      <ul className="lk-list lk-chat-messages" ref={ulRef}>
        {chatMessages.map((msg, idx, allMsg) => {
          const hideName = idx >= 1 && allMsg[idx - 1].from === msg.from;
          const hideTimestamp =
            idx >= 1 && msg.timestamp - allMsg[idx - 1].timestamp < 60_000;

          return (
            <ChatEntry
              key={msg.id ?? idx}
              hideName={hideName}
              hideTimestamp={hideName === false ? false : hideTimestamp}
              entry={msg}
              messageFormatter={messageFormatter}
            />
          );
        })}
      </ul>

      <form className="lk-chat-form meeting-chat-form" onSubmit={handleSubmit}>
        <MeetingChatEmojiPicker
          open={emojiOpen}
          disabled={isSending}
          inputRef={inputRef}
          onOpenChange={setEmojiOpenState}
          onInsert={insertEmoji}
        />
        <button
          type="submit"
          className="lk-button lk-chat-form-button"
          disabled={isSending}
        >
          Send
        </button>
      </form>
    </div>
  );
}

