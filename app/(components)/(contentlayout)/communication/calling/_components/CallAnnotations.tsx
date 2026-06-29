"use client";

import { useMemo, useState } from "react";
import {
  patchBolnaCallRecord,
  CALL_TAGS,
  CALL_RELATED_ENTITY_TYPES,
  type CallRecord,
  type CallTag,
  type CallRelatedEntityType,
} from "@/shared/lib/api/bolna";

const TAG_LABELS: Record<CallTag, string> = {
  sales: "Sales",
  support: "Support",
  follow_up: "Follow-up",
  complaint: "Complaint",
  demo: "Demo",
  payment: "Payment",
  other: "Other",
};

function apiErr(e: unknown, fallback: string): string {
  const msg =
    e && typeof e === "object" && "response" in e
      ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;
  return msg || (e instanceof Error ? e.message : fallback);
}

/**
 * Batch B annotation editor: free-text notes, CRM tags, and a generic entity link.
 * The entity link is a type + id pair (paste the id) — a searchable picker is Batch C.
 */
export default function CallAnnotations({
  record,
  canEdit = false,
  onSaved,
}: {
  record: CallRecord;
  canEdit?: boolean;
  onSaved?: (updated: CallRecord) => void;
}) {
  const id = record._id || record.id || "";

  const [notes, setNotes] = useState(record.notes ?? "");
  const [tags, setTags] = useState<CallTag[]>((record.tags as CallTag[]) ?? []);
  const [entityType, setEntityType] = useState<CallRelatedEntityType | "">(
    record.relatedTo?.entityType ?? ""
  );
  const [entityId, setEntityId] = useState(record.relatedTo?.entityId ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const dirty = useMemo(() => {
    const sameTags =
      tags.length === (record.tags?.length ?? 0) && tags.every((t) => record.tags?.includes(t));
    return (
      notes !== (record.notes ?? "") ||
      !sameTags ||
      entityType !== (record.relatedTo?.entityType ?? "") ||
      entityId.trim() !== (record.relatedTo?.entityId ?? "")
    );
  }, [notes, tags, entityType, entityId, record]);

  const toggleTag = (t: CallTag) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async () => {
    if (!canEdit) return;
    if (!id) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await patchBolnaCallRecord(id, {
        notes,
        tags,
        relatedTo: {
          entityType: entityType || null,
          entityId: entityType && entityId.trim() ? entityId.trim() : null,
        },
      });
      setFeedback({ kind: "ok", msg: "Saved" });
      onSaved?.(res.record);
    } catch (e) {
      setFeedback({ kind: "err", msg: apiErr(e, "Could not save annotations") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-defaultborder/60 dark:border-white/10 p-3">
      <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 flex items-center gap-1">
        <i className="ri-sticky-note-line text-info" />
        Notes &amp; tags
      </p>

      <textarea
        rows={3}
        value={notes}
        disabled={!canEdit}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={2000}
        placeholder="Add a note about this call…"
        className="w-full rounded-lg border border-defaultborder/70 bg-white px-3 py-2 text-[0.8rem] focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
      />

      <div className="flex flex-wrap gap-1.5">
        {CALL_TAGS.map((t) => {
          const on = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              disabled={!canEdit}
              onClick={() => toggleTag(t)}
              className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                on
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-defaultborder/70 text-defaulttextcolor/70 hover:bg-black/[0.03] dark:text-white/70 dark:hover:bg-white/5"
              }`}
            >
              {TAG_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={entityType}
          disabled={!canEdit}
          onChange={(e) => setEntityType(e.target.value as CallRelatedEntityType | "")}
          className="shrink-0 rounded-lg border border-defaultborder/70 bg-white px-2 py-2 text-[0.75rem] dark:border-white/10 dark:bg-black/20 dark:text-white"
          aria-label="Link to entity type"
        >
          <option value="">No link</option>
          {CALL_RELATED_ENTITY_TYPES.map((et) => (
            <option key={et} value={et}>
              {et.charAt(0).toUpperCase() + et.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={entityId}
          disabled={!canEdit || !entityType}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder={entityType ? `${entityType} id` : "select a type first"}
          className="w-full rounded-lg border border-defaultborder/70 bg-white px-2 py-2 font-mono text-[0.75rem] focus:outline-none disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canEdit || !dirty || saving || !id}
          className="rounded-lg bg-primary px-4 py-2 text-[0.8rem] font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {!canEdit ? (
          <span className="text-[0.75rem] text-defaulttextcolor/50 dark:text-white/40">
            Read-only
          </span>
        ) : null}
        {feedback ? (
          <span
            className={`text-[0.75rem] ${
              feedback.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-danger"
            }`}
          >
            {feedback.msg}
          </span>
        ) : null}
      </div>
    </div>
  );
}
