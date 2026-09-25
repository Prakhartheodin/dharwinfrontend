import * as React from "react";

import { cn } from "@/lib/utils";

type BubbleVariant =
  | "default"
  | "secondary"
  | "muted"
  | "tinted"
  | "outline"
  | "ghost"
  | "destructive";

type BubbleAlign = "start" | "end";

/**
 * Fills live on BubbleContent itself. Tailwind 3.4 composes
 * `*:data-[slot=bubble-content]:bg-*` as
 * `[data-slot=bubble-content] > *` on the *parent* — so backgrounds never
 * painted when the class sat on Bubble. Direct utilities avoid that.
 */
const bubbleContentFillClass: Record<BubbleVariant, string> = {
  default: "bg-primary text-violet-50 [button,a]:hover:bg-primary/90",
  secondary: "bg-secondary text-white [button,a]:hover:bg-secondary/90",
  muted:
    "bg-slate-100 text-slate-800 dark:bg-slate-800/70 dark:text-slate-100 " +
    "[button,a]:hover:bg-slate-200 dark:[button,a]:hover:bg-slate-700",
  tinted:
    "bg-primary/10 text-slate-900 dark:bg-primary/20 dark:text-slate-50 " +
    "[button,a]:hover:bg-primary/15",
  outline:
    "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 " +
    "[button,a]:hover:bg-slate-50 dark:[button,a]:hover:bg-slate-900",
  ghost:
    "rounded-none border-none bg-transparent p-0 " +
    "[button,a]:hover:bg-slate-100 dark:[button,a]:hover:bg-slate-800/50",
  destructive:
    "bg-danger/10 text-danger dark:bg-danger/20 [button,a]:hover:bg-danger/20",
};

const BubbleVariantContext = React.createContext<BubbleVariant>("default");

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: BubbleVariant;
  align?: BubbleAlign;
}) {
  return (
    <BubbleVariantContext.Provider value={variant}>
      <div
        data-slot="bubble"
        data-variant={variant}
        data-align={align}
        className={cn(
          "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1",
          "group-data-[align=end]/message:self-end data-[align=end]:self-end",
          "data-[variant=ghost]:max-w-full",
          className
        )}
        {...props}
      />
    </BubbleVariantContext.Provider>
  );
}

function BubbleContent({
  asChild = false,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const variant = React.useContext(BubbleVariantContext);

  // Roomier horizontal inset (32px) so glyphs clear rounded edges;
  // !important + inline backup beat purge/specificity fights. Vertical
  // padding (py-3, 12px) gets the same inline backup so top/bottom never
  // collapse either. box-border + wrap utilities keep long lines inside the fill.
  // Ghost keeps p-0 via fillClass + twMerge; skip inline pad for ghost.
  const isGhost = variant === "ghost";
  const classes = cn(
    "box-border w-fit max-w-full min-w-0 rounded-xl border border-transparent",
    isGhost ? "py-3 text-sm leading-relaxed" : "!px-8 py-3 text-sm leading-relaxed",
    "break-words [overflow-wrap:anywhere] [word-break:break-word]",
    "group-data-[align=end]/bubble:self-end",
    "[button]:text-left [button,a]:transition-colors",
    "[button,a]:outline-none [button,a]:focus-visible:ring-2 [button,a]:focus-visible:ring-primary/50",
    bubbleContentFillClass[variant],
    className
  );

  const padStyle: React.CSSProperties | undefined = isGhost
    ? style
    : { ...style, paddingLeft: 32, paddingRight: 32, paddingTop: 12, paddingBottom: 12 };

  if (asChild && React.isValidElement<{ className?: string; style?: React.CSSProperties }>(children)) {
    return React.cloneElement(children, {
      ...props,
      className: cn(classes, children.props.className),
      style: isGhost
        ? { ...children.props.style, ...style }
        : { ...children.props.style, ...style, paddingLeft: 32, paddingRight: 32 },
      ...({ "data-slot": "bubble-content" } as const),
    } as Partial<typeof children.props> & { className?: string; style?: React.CSSProperties });
  }

  return (
    <div data-slot="bubble-content" className={classes} {...props} style={padStyle}>
      {children}
    </div>
  );
}

const bubbleReactionsSideClass = {
  top: "top-0 -translate-y-3/4",
  bottom: "bottom-0 translate-y-3/4",
} as const;

const bubbleReactionsAlignClass = {
  start: "left-3",
  end: "right-3",
} as const;

/** Exported for API parity; FloatingChatbot does not use reactions. */
function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: BubbleAlign;
  side?: "top" | "bottom";
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(
        "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1",
        "rounded-full bg-slate-100 px-1.5 py-0.5 text-sm ring-2 ring-white",
        "dark:bg-slate-800 dark:ring-slate-950 has-[button]:p-0",
        bubbleReactionsSideClass[side],
        bubbleReactionsAlignClass[align],
        className
      )}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };
export type { BubbleVariant, BubbleAlign };
