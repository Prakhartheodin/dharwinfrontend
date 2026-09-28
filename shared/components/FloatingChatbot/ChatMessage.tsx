"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Block } from "@/shared/types/chatResponse";
import {
  AgentOrb,
  CopyButton,
  LAYOUT,
  ReasoningIndicator,
  SURFACE,
  TYPE,
  WRAP_ANYWHERE,
} from "./ui";
import StructuredResponse from "./renderers/StructuredResponse";
import { mdComponents } from "./renderers/markdown";

export type MessageStatus = "pending" | "streaming" | "done";

interface Props {
  role: "user" | "assistant";
  content: string;
  fullscreen?: boolean;
  blocks?: Block[];
  entityType?: string | null;
  queryId?: string | null;
  onAction?: (text: string) => void;
  /** Assistant only. `pending` = no token yet, `streaming` = tokens arriving. */
  status?: MessageStatus;
  /** Assistant only. False for the 2nd+ assistant message in a row. */
  showAuthor?: boolean;
}

function blocksMatchEntity(blocks: Block[] | undefined, entityType: string | null | undefined): Block[] {
  if (!blocks?.length) return [];
  if (entityType === "job" || entityType === "jobs") {
    return blocks.filter((b) => !(b.type === "table" && b.tableType === "employees"));
  }
  return blocks;
}

// The user bubble is a plain div on SURFACE.bubbleUser, not the shared
// components/ui/bubble primitive. That primitive's BubbleContent carries
// `max-w-full`, and app/globals.scss zeroes padding on `.max-w-full` with
// !important, so the text ran flush to the fill and the rounded corners
// clipped glyphs no matter what padding was passed in.
export default function ChatMessage({
  role, content, fullscreen = false, blocks, entityType, queryId, onAction,
  status = "done", showAuthor = true,
}: Props) {
  if (role === "user") {
    return (
      <article data-slot="message" className="flex w-full min-w-0 justify-end" aria-label="Your message">
        <div
          className={`min-w-0 max-w-[85%] whitespace-pre-wrap text-[13px] leading-[1.55] ${SURFACE.bubbleUser} ${WRAP_ANYWHERE}`}
        >
          {content}
        </div>
      </article>
    );
  }

  const visibleBlocks = blocksMatchEntity(blocks, entityType);
  if (status === "done" && !content && visibleBlocks.length === 0) return null;

  // Tables and card grids may break out of the 48rem reading column in
  // fullscreen; prose stays in the column.
  const wide = fullscreen && visibleBlocks.some((b) => b.type === "table" || b.type === "cards");

  return (
    <article
      data-slot="message"
      className="agent-msg flex w-full min-w-0 flex-col"
      aria-label="Dharwin reply"
      aria-busy={status !== "done"}
    >
      {showAuthor && (
        <div className="mb-1.5 flex items-center gap-2">
          <AgentOrb size="sm" />
          <span className={TYPE.author}>Dharwin</span>
        </div>
      )}

      <div className={`min-w-0 text-[13px] leading-[1.55] ${SURFACE.bubbleAgent} ${WRAP_ANYWHERE}`}>
        {status === "pending" && !content ? (
          <ReasoningIndicator />
        ) : (
          <div className="space-y-3">
            {content ? (
              // `agent-streaming` draws the blinking caret after the last
              // rendered text node (CSS in tokens.ts CONSOLE_KEYFRAMES).
              <div className={status === "streaming" ? "agent-streaming" : undefined}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : null}
            {visibleBlocks.length > 0 ? (
              <div className={wide ? LAYOUT.breakout : undefined}>
                <StructuredResponse
                  blocks={visibleBlocks}
                  compact={!fullscreen}
                  onAction={onAction}
                  queryId={queryId}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {status === "done" && content && (
        // -ml-2 lines the first icon up with the text edge (button has px-2).
        <div className="agent-msg-actions -ml-2 mt-1 flex items-center gap-0.5">
          <CopyButton text={content} />
        </div>
      )}
    </article>
  );
}
