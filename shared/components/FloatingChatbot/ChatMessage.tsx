import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { ReactNode } from "react";

interface Props {
  role: "user" | "assistant";
  content: string;
  fullscreen?: boolean;
}

// Minimal hast node shape we touch when walking ReactMarkdown's `node` prop.
type HastNode =
  | { type: "text"; value: string }
  | { type: "element"; tagName: string; children?: HastNode[]; properties?: Record<string, unknown> }
  | { type: string; children?: HastNode[]; value?: string; tagName?: string };

function hastText(node: HastNode | undefined | null): string {
  if (!node) return "";
  if (node.type === "text" && typeof (node as { value?: string }).value === "string") {
    return (node as { value: string }).value;
  }
  const children = (node as { children?: HastNode[] }).children;
  if (Array.isArray(children)) return children.map(hastText).join("");
  return "";
}

function findHast(node: HastNode | undefined, tag: string, out: HastNode[] = []): HastNode[] {
  if (!node) return out;
  const tagName = (node as { tagName?: string }).tagName;
  if (node.type === "element" && tagName === tag) out.push(node);
  const children = (node as { children?: HastNode[] }).children;
  if (Array.isArray(children)) for (const c of children) findHast(c, tag, out);
  return out;
}

// Render a hast subtree as React — text and inline emphasis only (table cells are flat).
function renderHast(node: HastNode | undefined, key?: number): ReactNode {
  if (!node) return null;
  if (node.type === "text") return (node as { value: string }).value;
  const children = (node as { children?: HastNode[] }).children ?? [];
  const rendered = children.map((c, i) => renderHast(c, i));
  const tagName = (node as { tagName?: string }).tagName;
  switch (tagName) {
    case "strong":
    case "b":
      return <strong key={key} className="font-semibold">{rendered}</strong>;
    case "em":
    case "i":
      return <em key={key} className="italic">{rendered}</em>;
    case "code":
      return <code key={key} className="bg-black/10 dark:bg-white/10 rounded px-1 text-[0.95em] font-mono">{rendered}</code>;
    case "a": {
      const href = ((node as { properties?: { href?: string } }).properties?.href) ?? "#";
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
          {rendered}
        </a>
      );
    }
    case "br":
      return <br key={key} />;
    default:
      return <span key={key}>{rendered}</span>;
  }
}

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-600 dark:text-gray-400">{children}</em>,
  h1: ({ children }) => <p className="font-bold text-sm mb-1.5 mt-2 first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-sm mb-1 mt-2 first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="font-medium text-sm mb-1 mt-1.5 first:mt-0">{children}</p>,
  hr: () => <hr className="my-2 border-gray-200 dark:border-gray-700" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 italic text-gray-500 dark:text-gray-400 mb-2">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <pre className="bg-gray-900 dark:bg-black text-gray-100 rounded-lg px-3 py-2 text-xs mb-2 whitespace-pre-wrap break-all">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono">
        {children}
      </code>
    );
  },
  // Tables → vertical stack of "Label: Value" cards. Walks the original hast (`node`)
  // so we own the layout end-to-end — no horizontal scroll on narrow chat bubbles.
  table: ({ node }) => {
    const tableNode = node as unknown as HastNode | undefined;
    const headerCells = findHast(tableNode, "th");
    const headers = headerCells.map((th) => hastText(th).trim());
    const dataRows = findHast(tableNode, "tr").filter((tr) => findHast(tr, "td").length > 0);

    if (!dataRows.length) return null;

    return (
      <div className="mb-2 space-y-2">
        {dataRows.map((row, ri) => {
          const cells = findHast(row, "td");
          return (
            <div
              key={ri}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-3 py-2 text-xs"
            >
              {cells.map((cell, ci) => {
                const label = headers[ci] || `Field ${ci + 1}`;
                const valueText = hastText(cell).trim();
                if (!valueText) return null;
                const cellChildren = (cell as { children?: HastNode[] }).children ?? [];
                return (
                  <div
                    key={ci}
                    className="flex flex-col sm:flex-row sm:gap-2 py-0.5 leading-snug border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                  >
                    <span className="font-semibold text-gray-700 dark:text-gray-300 sm:min-w-[6.5rem] sm:max-w-[40%] break-words">
                      {label}:
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 break-words flex-1 min-w-0">
                      {cellChildren.map((c, i) => renderHast(c, i))}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  },
  // ReactMarkdown still walks inner cells and calls these renderers; return null
  // because the `table` renderer above has already produced the full visual output.
  thead: () => null,
  tbody: () => null,
  tr: () => null,
  th: () => null,
  td: () => null,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
};

export default function ChatMessage({ role, content, fullscreen = false }: Props) {
  const isUser = role === "user";
  // Bubble width adapts to viewport mode: in fullscreen the chat panel covers the entire
  // viewport, so let assistant bubbles span up to 96% to give tables/cards room. User
  // bubbles cap a touch tighter so they read like chat instead of a wall of text.
  const bubbleMax = fullscreen
    ? isUser
      ? "max-w-[88%] sm:max-w-[75%] md:max-w-[65%]"
      : "max-w-[96%] sm:max-w-[92%] md:max-w-[90%]"
    : "max-w-[90%] sm:max-w-[85%]";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
          D
        </div>
      )}
      <div
        className={`${bubbleMax} min-w-0 px-3 py-2 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
          isUser
            ? "bg-primary text-white rounded-tr-sm whitespace-pre-wrap"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm"
        }`}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
