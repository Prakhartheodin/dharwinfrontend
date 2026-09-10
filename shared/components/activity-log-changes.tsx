import type { ActivityLog } from "@/shared/lib/types";

type ChangeRow = {
  field: string;
  from?: unknown;
  to?: unknown;
  changed?: boolean;
  added?: string[];
  removed?: string[];
};

function formatArrayDelta(kind: "added" | "removed", items: string[] | undefined): string {
  if (!items?.length) return "—";
  const noun = items.length === 1 ? "file" : "files";
  return `${kind === "added" ? "Added" : "Removed"} ${items.length} ${noun}: ${items.join(", ")}`;
}

function normalizeChanges(metadata: Record<string, unknown> | null | undefined): ChangeRow[] {
  if (!metadata) return [];
  const raw = metadata.changes;
  if (Array.isArray(raw)) {
    return raw.filter((c) => c && typeof c === "object" && "field" in c) as ChangeRow[];
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([field, val]) => {
      if (val === "[changed]") return { field, changed: true };
      if (val && typeof val === "object" && ("added" in val || "removed" in val)) {
        const v = val as { added?: string[]; removed?: string[] };
        return { field, added: v.added, removed: v.removed };
      }
      if (val && typeof val === "object" && ("from" in val || "to" in val)) {
        const v = val as { from?: unknown; to?: unknown };
        return { field, from: v.from, to: v.to };
      }
      return { field, changed: true };
    });
  }
  return [];
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v === "" ? "(empty)" : v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function ActivityLogChangesBlock({
  log,
}: {
  log: ActivityLog;
}) {
  const meta = (log.metadata ?? {}) as Record<string, unknown>;
  const changes = normalizeChanges(meta);
  if (!changes.length && !meta.selfService && !meta.staffEdit) return null;

  return (
    <div className="mt-2 rounded-md border border-defaultborder/70 bg-gray-50/60 dark:bg-gray-800/30 px-3 py-2 text-[0.75rem]">
      {(meta.selfService || meta.staffEdit) && (
        <p className="mb-1 text-defaulttextcolor/70">
          {meta.selfService ? "Self-service edit" : "Staff edit"}
          {meta.auditSource ? ` · ${String(meta.auditSource)}` : ""}
        </p>
      )}
      {changes.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[0.65rem] uppercase text-defaulttextcolor/50">
              <th className="pr-2 py-1">Field</th>
              <th className="pr-2 py-1">From</th>
              <th className="py-1">To</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.field} className="border-t border-defaultborder/40">
                <td className="pr-2 py-1 font-mono">{c.field}</td>
                <td className="pr-2 py-1 break-all">
                  {c.added || c.removed
                    ? formatArrayDelta("removed", c.removed)
                    : c.changed
                      ? "[changed]"
                      : formatVal(c.from)}
                </td>
                <td className="py-1 break-all">
                  {c.added || c.removed
                    ? formatArrayDelta("added", c.added)
                    : c.changed
                      ? "[changed]"
                      : formatVal(c.to)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
