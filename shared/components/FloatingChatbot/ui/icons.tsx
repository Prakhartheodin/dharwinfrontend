"use client";
import type { ReactNode } from "react";

// One icon family for the chatbot chrome: lucide geometry, 24px grid, 1.75
// stroke, round caps. lucide-react is not a dependency, so the few glyphs the
// panel needs are inlined here instead of mixing hand-drawn heroicons paths
// with different strokes.

function Svg({ children, className = "h-[18px] w-[18px]" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      className={`flex-shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const SparkleIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4M22 5h-4" />
  </Svg>
);

export const TrashIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
  </Svg>
);

export const MaximizeIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </Svg>
);

export const MinimizeIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </Svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const CopyIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const ArrowUpIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m5 12 7-7 7 7M12 19V5" />
  </Svg>
);

export const ArrowDownIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Svg>
);
