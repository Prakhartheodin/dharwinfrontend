import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  role: "user" | "assistant";
  content: string;
}

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-500 dark:text-gray-400 mb-2">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <pre className="bg-gray-900 dark:bg-black text-gray-100 rounded-lg px-3 py-2 text-xs overflow-x-auto mb-2 whitespace-pre">
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
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
};

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
          D
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
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
