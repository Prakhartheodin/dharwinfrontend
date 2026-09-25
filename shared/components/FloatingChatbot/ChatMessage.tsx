"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Block } from "@/shared/types/chatResponse";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { AgentOrb, CopyButton, SURFACE, TYPE } from "./ui";
import StructuredResponse from "./renderers/StructuredResponse";
import { mdComponents } from "./renderers/markdown";

interface Props {
  role: "user" | "assistant";
  content: string;
  fullscreen?: boolean;
  blocks?: Block[];
  entityType?: string | null;
  queryId?: string | null;
  onAction?: (text: string) => void;
}

function blocksMatchEntity(blocks: Block[] | undefined, entityType: string | null | undefined): Block[] {
  if (!blocks?.length) return [];
  if (entityType === "job" || entityType === "jobs") {
    return blocks.filter((b) => !(b.type === "table" && b.tableType === "employees"));
  }
  return blocks;
}

export default function ChatMessage({ role, content, fullscreen = false, blocks, entityType, queryId, onAction }: Props) {
  const isUser = role === "user";
  const visibleBlocks = blocksMatchEntity(blocks, entityType);

  // Widen the primitive's default max-w-[80%] for this panel's measure.
  const bubbleWidth = fullscreen
    ? isUser
      ? "max-w-[min(100%,42rem)] sm:max-w-[min(75%,40rem)] md:max-w-[min(65%,36rem)]"
      : "max-w-[96%] sm:max-w-[92%] md:max-w-[90%]"
    : isUser
      ? "max-w-[min(100%,22rem)] sm:max-w-[min(100%,24rem)]"
      : "max-w-[92%] sm:max-w-[90%]";

  return (
    <article
      data-slot="message"
      data-align={isUser ? "end" : "start"}
      className={`group/msg group/message mb-5 flex w-full min-w-0 last:mb-2 ${
        isUser ? "justify-end" : "justify-start"
      }`}
      aria-label={isUser ? "Your message" : "Dharwin reply"}
    >
      {!isUser && (
        <div className="mr-2.5 mt-0.5 flex-shrink-0 self-start">
          <AgentOrb size="sm" />
        </div>
      )}

      <div
        className={[
          "flex min-w-0 max-w-full flex-col",
          isUser ? "items-end" : "flex-1",
        ].join(" ")}
      >
        <div className={`mb-1.5 flex items-center gap-2 px-1 ${isUser ? "justify-end" : ""}`}>
          <span className={TYPE.author}>{isUser ? "You" : "Dharwin"}</span>
        </div>

        <BubbleGroup
          className={isUser ? "w-fit max-w-full self-end" : "w-full"}
        >
          <Bubble
            variant={isUser ? "default" : "ghost"}
            align={isUser ? "end" : "start"}
            className={bubbleWidth}
          >
            <BubbleContent
              className={[
                "text-[13px] leading-[1.55]",
                // User: hug copy (w-fit) so BubbleContent !px-8 expands the purple box.
                // Assistant: ghost bubble has no fill, so set text color explicitly.
                isUser ? "w-fit max-w-full whitespace-pre-wrap" : `w-full max-w-full ${SURFACE.bubbleAgent}`,
              ].join(" ")}
            >
              {isUser ? (
                content
              ) : (
                <div className="space-y-3">
                  {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {content}
                    </ReactMarkdown>
                  ) : null}
                  {visibleBlocks.length > 0 ? (
                    <StructuredResponse
                      blocks={visibleBlocks}
                      compact={!fullscreen}
                      onAction={onAction}
                      queryId={queryId}
                    />
                  ) : !content ? (
                    <span className="text-slate-400">…</span>
                  ) : null}
                </div>
              )}
            </BubbleContent>
          </Bubble>
        </BubbleGroup>

        {!isUser && content && (
          <div className="mt-2 flex items-center justify-start">
            <CopyButton text={content} />
          </div>
        )}
      </div>
    </article>
  );
}
