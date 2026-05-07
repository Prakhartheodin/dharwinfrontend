// uat.dharwin.frontend/shared/types/chatResponse.ts
//
// Mirror of the backend `chatAssistant/renderers/types.js` envelope. Keep
// in sync. Wire contract: backend always emit { reply, blocks, meta }.
// `reply` stay markdown for backward-compat / a11y / copy-paste; `blocks`
// drive the structured renderer when present.

export type Tone = "neutral" | "info" | "success" | "warn" | "danger";

export interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  priority?: "primary" | "secondary";
  format?: "date" | "number" | "badge" | "currency" | "mono";
}

export type CellValue = string | number | { v: string; tone?: Tone };
export type Row = Record<string, CellValue>;

export interface Pagination {
  from: number;
  to: number;
  total: number;
  hasMore: boolean;
}

export interface TextBlock      { type: "text"; md: string }
export interface HeadingBlock   { type: "heading"; level: 1 | 2 | 3; text: string }
export interface CalloutBlock   { type: "callout"; tone: Tone; md: string; icon?: string }
export interface KVBlock        {
  type: "kv";
  title?: string;
  pairs: { label: string; value: string; tone?: Tone }[];
}
export interface BadgeRowBlock  {
  type: "badge_row";
  chips: { label: string; tone: Tone; count?: number }[];
}
export interface TableBlock     {
  type: "table";
  id: string;
  // Semantic kind ('agents' | 'employees' | 'recruiters' | 'candidates' | 'students' | 'people').
  // Backend-driven and authoritative — UI must NOT infer columns from this; columns come
  // from `columns`, already RBAC + profile filtered server-side.
  tableType?: string;
  title?: string;
  columns: Column[];
  rows: Row[];
  pagination?: Pagination;
  layout?: "auto" | "table" | "cards";
}
export interface CardsBlock     {
  type: "cards";
  id: string;
  layout: "employee" | "job" | "project" | "generic";
  items: Record<string, unknown>[];
}
export interface GroupBlock     {
  type: "group";
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  blocks: Block[];
}
export interface FallbackBlock  {
  type: "fallback";
  kind: string;
  title: string;
  reasons: string[];
  suggestions: string[];
  query?: string;
}
export interface ActionsBlock   {
  type: "actions";
  buttons: { label: string; intent: "query" | "navigate"; payload: string }[];
}

export type Block =
  | TextBlock
  | HeadingBlock
  | CalloutBlock
  | KVBlock
  | BadgeRowBlock
  | TableBlock
  | CardsBlock
  | GroupBlock
  | FallbackBlock
  | ActionsBlock;

export interface ChatMeta {
  kind: string | null;
  total: number | null;
  deterministic: boolean;
  tookMs: number | null;
}

export interface ChatResponse {
  reply: string;
  blocks: Block[];
  meta: ChatMeta;
}

const BLOCK_TYPES = new Set<Block["type"]>([
  "text", "heading", "callout", "kv", "badge_row",
  "table", "cards", "group", "fallback", "actions",
]);

export function isBlock(value: unknown): value is Block {
  if (!value || typeof value !== "object") return false;
  const t = (value as { type?: unknown }).type;
  return typeof t === "string" && BLOCK_TYPES.has(t as Block["type"]);
}
