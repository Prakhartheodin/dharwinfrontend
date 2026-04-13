"use client";

import React, { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { EmailTemplateModal } from "@/shared/components/email-template-modal";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { hasEmailManageAccess, hasEmailReadAccess } from "@/shared/lib/permissions";
import * as emailApi from "@/shared/lib/api/email";
import type { AgentEmailTemplate, AgentEmailTemplateShared } from "@/shared/lib/api/email";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

export default function SettingsEmailTemplatesPage() {
  const router = useRouter();
  const { permissions, permissionsLoaded } = useAuth();
  const canReadEmailPreferences = hasEmailReadAccess(permissions ?? []);
  const canManageEmailPreferences = hasEmailManageAccess(permissions ?? []);

  const [loading, setLoading] = useState(true);
  const [own, setOwn] = useState<AgentEmailTemplate[]>([]);
  const [shared, setShared] = useState<AgentEmailTemplateShared[]>([]);
  const [sigHtml, setSigHtml] = useState("");
  const [sigEnabled, setSigEnabled] = useState(true);
  const [savingSig, setSavingSig] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formShared, setFormShared] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!canReadEmailPreferences) {
      router.replace(ROUTES.settingsPersonalInfo);
    }
  }, [permissionsLoaded, canReadEmailPreferences, router]);

  const loadAll = useCallback(async () => {
    if (!canReadEmailPreferences) return;
    setLoading(true);
    try {
      const [tplRes, sigRes] = await Promise.all([
        emailApi.listAgentEmailTemplates(),
        emailApi.getAgentEmailSignature(),
      ]);
      setOwn(tplRes.own);
      setShared(tplRes.shared);
      setSigHtml(sigRes.html ?? "");
      setSigEnabled(sigRes.enabled ?? true);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Failed to load email preferences.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [canReadEmailPreferences]);

  useEffect(() => {
    if (permissionsLoaded && canReadEmailPreferences) void loadAll();
  }, [permissionsLoaded, canReadEmailPreferences, loadAll]);

  const openCreate = () => {
    setEditingId(null);
    setFormTitle("");
    setFormSubject("");
    setFormBody("<p></p>");
    setFormShared(false);
    setModalOpen(true);
  };

  const openEdit = (t: AgentEmailTemplate) => {
    setEditingId(t.id);
    setFormTitle(t.title);
    setFormSubject(t.subject ?? "");
    setFormBody(t.bodyHtml || "<p></p>");
    setFormShared(Boolean(t.isShared));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const saveTemplate = async () => {
    const title = formTitle.trim();
    if (!title) {
      await Swal.fire({ icon: "warning", title: "Title required" });
      return;
    }
    setSavingTpl(true);
    try {
      if (editingId) {
        await emailApi.updateAgentEmailTemplate(editingId, {
          title,
          subject: formSubject.trim(),
          bodyHtml: formBody,
          isShared: formShared,
        });
      } else {
        await emailApi.createAgentEmailTemplate({
          title,
          subject: formSubject.trim(),
          bodyHtml: formBody,
          isShared: formShared,
        });
      }
      await Swal.fire({ icon: "success", title: "Saved", toast: true, timer: 2000, showConfirmButton: false, position: "top-end" });
      closeModal();
      await loadAll();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Save failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSavingTpl(false);
    }
  };

  const removeTemplate = async (t: AgentEmailTemplate) => {
    const r = await Swal.fire({
      icon: "warning",
      title: "Delete template?",
      text: t.title,
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await emailApi.deleteAgentEmailTemplate(t.id);
      await loadAll();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Delete failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  };

  const saveSignature = async () => {
    setSavingSig(true);
    try {
      await emailApi.patchAgentEmailSignature({ html: sigHtml, enabled: sigEnabled });
      await Swal.fire({ icon: "success", title: "Signature saved", toast: true, timer: 2000, showConfirmButton: false, position: "top-end" });
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Save failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSavingSig(false);
    }
  };

  if (!permissionsLoaded || !canReadEmailPreferences) {
    return (
      <Fragment>
        <Seo title="Email templates" />
        <div className="p-4 text-[#8c9097]">Loading…</div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Email templates & signatures" />
      <div className="p-4 space-y-8">
        <div>
          <h5 className="font-semibold text-lg mb-1">Email signature</h5>
          <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-3">
            Used when you compose a <strong>new</strong> message in Communication → Email (Gmail or Outlook). Inline styles work best in email clients.
          </p>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={sigEnabled}
              onChange={(e) => setSigEnabled(e.target.checked)}
              className="form-checkbox"
            />
            <span className="text-[0.875rem]">Enable signature</span>
          </label>
          <div className="border border-defaultborder rounded-lg overflow-hidden mb-3">
            <TiptapEditor content={sigHtml} placeholder="Name, title, phone…" onChange={setSigHtml} />
          </div>
          <button type="button" className="ti-btn ti-btn-primary !mb-0" onClick={saveSignature} disabled={savingSig || !canManageEmailPreferences}>
            {savingSig ? "Saving…" : "Save signature"}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div>
              <h5 className="font-semibold text-lg mb-1">Templates</h5>
              <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0">
                Insert from the Templates button while composing. Shared templates are visible to all agents.
              </p>
            </div>
            <button type="button" className="ti-btn ti-btn-primary !mb-0" onClick={openCreate} disabled={!canManageEmailPreferences}>
              <i className="ri-add-line me-1" />
              New template
            </button>
          </div>

          {loading ? (
            <p className="text-[#8c9097]">Loading templates…</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h6 className="text-sm font-semibold mb-2">My templates</h6>
                {own.length === 0 ? (
                  <p className="text-[0.8125rem] text-[#8c9097]">No templates yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {own.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 p-3 sm:p-4 rounded-lg border border-defaultborder bg-white/40 dark:bg-black/20"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{t.title}</div>
                          {t.subject ? (
                            <div className="text-[0.75rem] text-[#8c9097]">Subject: {t.subject}</div>
                          ) : null}
                          {t.isShared ? (
                            <span className="inline-block mt-1 text-[0.65rem] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Shared
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="flex flex-wrap items-stretch justify-stretch sm:justify-end gap-2 shrink-0 w-full sm:w-auto"
                          role="group"
                          aria-label="Template actions"
                        >
                          <button
                            type="button"
                            className="ti-btn ti-btn-light !mb-0 flex-1 sm:flex-none !min-h-[2.5rem] !py-2 !px-3.5 inline-flex items-center justify-center gap-2 rounded-lg border border-defaultborder/80 shadow-sm hover:shadow transition-shadow"
                            onClick={() => openEdit(t)}
                            disabled={!canManageEmailPreferences}
                          >
                            <i className="ri-pencil-line text-[1.05rem] shrink-0" aria-hidden />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="ti-btn ti-btn-danger !mb-0 flex-1 sm:flex-none !min-h-[2.5rem] !py-2 !px-3.5 inline-flex items-center justify-center gap-2 rounded-lg shadow-sm hover:shadow transition-shadow"
                            onClick={() => removeTemplate(t)}
                            disabled={!canManageEmailPreferences}
                          >
                            <i className="ri-delete-bin-line text-[1.05rem] shrink-0" aria-hidden />
                            <span>Delete</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h6 className="text-sm font-semibold mb-2">Shared by other agents</h6>
                {shared.length === 0 ? (
                  <p className="text-[0.8125rem] text-[#8c9097]">No shared templates.</p>
                ) : (
                  <ul className="space-y-2">
                    {shared.map((t) => (
                      <li
                        key={t.id}
                        className="p-3 rounded border border-defaultborder bg-white/40 dark:bg-black/20"
                      >
                        <div className="font-medium">{t.title}</div>
                        <div className="text-[0.75rem] text-[#8c9097]">
                          From {t.owner?.name || t.owner?.email || "agent"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailTemplateModal
        open={modalOpen}
        titleId="tpl-modal-title"
        editingId={editingId}
        formTitle={formTitle}
        formSubject={formSubject}
        formBody={formBody}
        formShared={formShared}
        saving={savingTpl}
        onClose={closeModal}
        onSave={saveTemplate}
        onTitleChange={setFormTitle}
        onSubjectChange={setFormSubject}
        onBodyChange={setFormBody}
        onSharedChange={setFormShared}
      />
    </Fragment>
  );
}
