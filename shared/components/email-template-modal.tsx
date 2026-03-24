"use client";

import React, { useEffect } from "react";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";

const VARIABLE_SNIPPETS = [
  { label: "Recipient name", snippet: "{{recipient_name}}" },
  { label: "Your name", snippet: "{{agent_name}}" },
  { label: "Recipient email", snippet: "{{recipient_email}}" },
  { label: "Date", snippet: "{{date}}" },
] as const;

function appendPlaceholderParagraph(html: string, snippet: string): string {
  const block = `<p>${snippet}</p>`;
  if (!html || html === "<p></p>" || html.trim() === "") return block;
  return html + block;
}

export type EmailTemplateModalProps = {
  open: boolean;
  titleId: string;
  editingId: string | null;
  formTitle: string;
  formSubject: string;
  formBody: string;
  formShared: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSharedChange: (v: boolean) => void;
  /** Shown under the main title (e.g. which agent the admin is editing). */
  contextLine?: string;
};

export function EmailTemplateModal({
  open,
  titleId,
  editingId,
  formTitle,
  formSubject,
  formBody,
  formShared,
  saving,
  onClose,
  onSave,
  onTitleChange,
  onSubjectChange,
  onBodyChange,
  onSharedChange,
  contextLine,
}: EmailTemplateModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const insertSnippet = (snippet: string) => {
    onBodyChange(appendPlaceholderParagraph(formBody, snippet));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative bg-bodybg border border-defaultborder rounded-2xl shadow-[0_24px_48px_-12px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06] dark:ring-white/[0.08] w-full max-w-3xl max-h-[min(92vh,880px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-defaultborder bg-gradient-to-br from-primary/[0.07] via-bodybg to-bodybg dark:from-primary/[0.12] dark:via-bodybg dark:to-bodybg">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex items-start gap-3">
              <div
                className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-defaultborder bg-white/70 text-primary dark:bg-white/[0.06] dark:text-primary"
                aria-hidden
              >
                <i className="ri-mail-send-line text-xl" />
              </div>
              <div className="min-w-0 border-l-[3px] border-primary pl-3 sm:pl-4">
                <h5 id={titleId} className="font-semibold text-[1.05rem] leading-tight mb-0 tracking-tight">
                  {editingId ? "Edit template" : "New template"}
                </h5>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mt-1 mb-0 leading-snug">
                  {contextLine ??
                    (editingId
                      ? "Update the saved message, subject line, and sharing."
                      : "Name it, optionally set a default subject, then write the message body.")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ti-btn ti-btn-light !py-2 !px-2.5 shrink-0 rounded-lg hover:!bg-black/[0.06] dark:hover:!bg-white/[0.08] transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="ri-close-line text-xl leading-none" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-6 space-y-8">
          <section className="space-y-4" aria-labelledby={`${titleId}-details`}>
            <div className="flex items-baseline justify-between gap-2">
              <h6 id={`${titleId}-details`} className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#8c9097] dark:text-white/45 mb-0">
                Template details
              </h6>
            </div>
            <div className="grid gap-4 sm:grid-cols-1">
              <div>
                <label className="form-label mb-1.5" htmlFor={`${titleId}-fld-title`}>
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  id={`${titleId}-fld-title`}
                  className="form-control rounded-lg transition-shadow shadow-sm focus:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/35"
                  value={formTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="e.g. Follow-up after interview"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="form-label mb-1.5" htmlFor={`${titleId}-fld-subject`}>
                  Default subject <span className="font-normal text-[#8c9097]">(optional)</span>
                </label>
                <input
                  id={`${titleId}-fld-subject`}
                  className="form-control rounded-lg transition-shadow shadow-sm focus:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/35"
                  value={formSubject}
                  onChange={(e) => onSubjectChange(e.target.value)}
                  placeholder="Pre-fills the email subject when you pick this template"
                  autoComplete="off"
                />
              </div>
            </div>
          </section>

          <div className="rounded-xl border border-defaultborder bg-white/[0.45] dark:bg-black/25 p-4 flex gap-3 items-start">
            <div className="mt-0.5 text-primary shrink-0" aria-hidden>
              <i className="ri-team-line text-lg" />
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none m-0 flex-1 min-w-0">
              <input
                type="checkbox"
                className="mt-1 rounded border-defaultborder text-primary focus:ring-primary/30"
                checked={formShared}
                onChange={(e) => onSharedChange(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-medium text-defaulttextcolor dark:text-white/90">
                  Share with all agents
                </span>
                <span className="block text-[0.8125rem] text-[#8c9097] dark:text-white/45 leading-snug mt-0.5">
                  When enabled, every agent can pick this template in compose. You still own and edit it from your settings.
                </span>
              </span>
            </label>
          </div>

          <section className="space-y-3 pt-1" aria-labelledby={`${titleId}-body`}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h6 id={`${titleId}-body`} className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#8c9097] dark:text-white/45 mb-1">
                  Message body
                </h6>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/45 mb-0 leading-snug">
                  Rich text is inserted into the email. Use placeholders below if your workflow replaces them later.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/40 self-center mr-1">
                Insert
              </span>
              {VARIABLE_SNIPPETS.map((v) => (
                <button
                  key={v.snippet}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-defaultborder/90 bg-white/60 dark:bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-mono text-defaulttextcolor/85 dark:text-white/80 hover:border-primary/60 hover:bg-primary/[0.06] hover:text-primary transition-colors"
                  onClick={() => insertSnippet(v.snippet)}
                  title={v.snippet}
                  aria-label={`Insert placeholder ${v.label}`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl overflow-hidden border border-defaultborder shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] bg-white/50 dark:bg-bgdark/40">
              <TiptapEditor
                content={formBody}
                placeholder="Write your template…"
                onChange={onBodyChange}
                toolbarClassName="!px-3 !py-2.5 !gap-1.5 !rounded-none border-defaultborder/80 bg-black/[0.025] dark:bg-white/[0.04] [&_.ti-btn]:!min-h-9 [&_.ti-btn]:!min-w-9 [&_.ti-btn]:!inline-flex [&_.ti-btn]:!items-center [&_.ti-btn]:!justify-center"
                contentClassName="!rounded-none !rounded-b-xl !min-h-[280px] !border-0 !border-t !border-defaultborder/60 dark:!border-defaultborder/20 bg-white/90 dark:bg-bodydark/90 !p-4 sm:!p-5 [&_.ProseMirror]:!min-h-[248px]"
              />
            </div>
          </section>
        </div>

        <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-t border-defaultborder bg-black/[0.02] dark:bg-white/[0.03]">
          <p className="text-[0.75rem] text-[#8c9097] dark:text-white/40 mb-0 text-center sm:text-left">
            Press <kbd className="px-1 py-0.5 rounded border border-defaultborder bg-white/80 dark:bg-white/10 font-mono text-[0.65rem]">Esc</kbd>{" "}
            to cancel
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="ti-btn ti-btn-light !mb-0 rounded-lg min-w-[5.5rem]" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary !mb-0 rounded-lg min-w-[6.5rem] inline-flex items-center justify-center gap-1.5 shadow-sm"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <i className="ri-save-3-line text-base" aria-hidden />
                  Save template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
