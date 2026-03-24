"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { EmailTemplateModal } from "@/shared/components/email-template-modal";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import * as emailApi from "@/shared/lib/api/email";
import type { AgentEmailTemplate, AgentEmailSignature } from "@/shared/lib/api/email";
import * as candidatesApi from "@/shared/lib/api/candidates";
import type { AgentOption } from "@/shared/lib/api/candidates";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

export default function SettingsEmailTemplatesAdminPage() {
  const router = useRouter();
  const { isAdministrator, permissionsLoaded } = useAuth();

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [templates, setTemplates] = useState<AgentEmailTemplate[]>([]);
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
    if (!isAdministrator) router.replace(ROUTES.settingsPersonalInfo);
  }, [permissionsLoaded, isAdministrator, router]);

  useEffect(() => {
    if (!isAdministrator) return;
    (async () => {
      setLoadingAgents(true);
      try {
        const data = await candidatesApi.getStudentAgentAssignments();
        setAgents(data.agents);
      } catch {
        await Swal.fire({ icon: "error", title: "Failed to load agents" });
      } finally {
        setLoadingAgents(false);
      }
    })();
  }, [isAdministrator]);

  useEffect(() => {
    if (agents.length && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const loadAgentData = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoadingData(true);
    try {
      const [tplRes, sigRes] = await Promise.all([
        emailApi.adminListAgentEmailTemplates(userId),
        emailApi.adminGetAgentEmailSignature(userId),
      ]);
      setTemplates(tplRes.results);
      setSigHtml(sigRes.html ?? "");
      setSigEnabled(sigRes.enabled ?? true);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Failed to load data";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
      setTemplates([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgentId && isAdministrator) void loadAgentData(selectedAgentId);
  }, [selectedAgentId, isAdministrator, loadAgentData]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

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
    if (!title || !selectedAgentId) {
      await Swal.fire({ icon: "warning", title: "Title required" });
      return;
    }
    setSavingTpl(true);
    try {
      if (editingId) {
        await emailApi.adminUpdateAgentEmailTemplate(editingId, {
          title,
          subject: formSubject.trim(),
          bodyHtml: formBody,
          isShared: formShared,
        });
      } else {
        await emailApi.adminCreateAgentEmailTemplate({
          userId: selectedAgentId,
          title,
          subject: formSubject.trim(),
          bodyHtml: formBody,
          isShared: formShared,
        });
      }
      await Swal.fire({ icon: "success", title: "Saved", toast: true, timer: 2000, showConfirmButton: false, position: "top-end" });
      closeModal();
      await loadAgentData(selectedAgentId);
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
    if (!r.isConfirmed || !selectedAgentId) return;
    try {
      await emailApi.adminDeleteAgentEmailTemplate(t.id);
      await loadAgentData(selectedAgentId);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Delete failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  };

  const saveSignature = async () => {
    if (!selectedAgentId) return;
    setSavingSig(true);
    try {
      await emailApi.adminPatchAgentEmailSignature({
        userId: selectedAgentId,
        html: sigHtml,
        enabled: sigEnabled,
      });
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

  if (!permissionsLoaded || !isAdministrator) {
    return (
      <Fragment>
        <Seo title="Email templates (admin)" />
        <div className="p-4 text-[#8c9097]">Loading…</div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Email templates — all agents" />
      <div className="p-4 space-y-8">
        <div>
          <label className="form-label">Agent</label>
          {loadingAgents ? (
            <p className="text-[0.8125rem] text-[#8c9097]">Loading agents…</p>
          ) : agents.length === 0 ? (
            <p className="text-[0.8125rem] text-warning">No users with the Agent role found.</p>
          ) : (
            <select
              className="form-select max-w-md"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          )}
          {selectedAgent ? (
            <p className="text-[0.75rem] text-[#8c9097] mt-1 mb-0">Managing templates and signature for this agent.</p>
          ) : null}
        </div>

        {selectedAgentId ? (
          <>
            <div>
              <h5 className="font-semibold text-lg mb-1">Signature</h5>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={sigEnabled}
                  onChange={(e) => setSigEnabled(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-[0.875rem]">Enabled</span>
              </label>
              <div className="border border-defaultborder rounded-lg overflow-hidden mb-3">
                <TiptapEditor content={sigHtml} placeholder="Signature HTML…" onChange={setSigHtml} />
              </div>
              <button type="button" className="ti-btn ti-btn-primary !mb-0" onClick={saveSignature} disabled={savingSig}>
                {savingSig ? "Saving…" : "Save signature"}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h5 className="font-semibold text-lg mb-0">Templates</h5>
                <button type="button" className="ti-btn ti-btn-primary !mb-0" onClick={openCreate} disabled={loadingData}>
                  New template
                </button>
              </div>
              {loadingData ? (
                <p className="text-[#8c9097]">Loading…</p>
              ) : templates.length === 0 ? (
                <p className="text-[0.8125rem] text-[#8c9097]">No templates for this agent.</p>
              ) : (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 p-3 sm:p-4 rounded-lg border border-defaultborder bg-white/40 dark:bg-black/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{t.title}</div>
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
                        >
                          <i className="ri-pencil-line text-[1.05rem] shrink-0" aria-hidden />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-danger !mb-0 flex-1 sm:flex-none !min-h-[2.5rem] !py-2 !px-3.5 inline-flex items-center justify-center gap-2 rounded-lg shadow-sm hover:shadow transition-shadow"
                          onClick={() => removeTemplate(t)}
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
          </>
        ) : null}
      </div>

      <EmailTemplateModal
        open={modalOpen}
        titleId="admin-tpl-modal-title"
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
        contextLine={
          selectedAgent
            ? `Managing templates for ${selectedAgent.name}${selectedAgent.email ? ` · ${selectedAgent.email}` : ""}`
            : undefined
        }
      />
    </Fragment>
  );
}
