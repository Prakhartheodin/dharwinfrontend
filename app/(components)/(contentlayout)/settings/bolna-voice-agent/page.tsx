"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { hasSettingsUsersManage } from "@/shared/lib/permissions";
import * as kbApi from "@/shared/lib/api/voiceAgentKb";
import type { KbDocument, KbDocumentBolnaMeta, VoiceAgentRow } from "@/shared/lib/api/voiceAgentKb";
import { AxiosError } from "axios";

const BOLNA_MIRROR_HINT =
  "Bolna only mirrors PDF and URL ingests. On the server set KB_BOLNA_SYNC_ENABLED=true and BOLNA_API_KEY. PDFs uploaded before sync was on must be deleted and re-uploaded to obtain a RAG ID.";

function bolnaKbCell(metadata: KbDocument["metadata"], docType: KbDocument["type"]) {
  const b = metadata?.bolna as KbDocumentBolnaMeta | undefined;

  if (docType === "text") {
    return (
      <span
        className="text-xs text-defaulttextcolor/55 leading-snug block max-w-[14rem]"
        title="Pasted text is indexed only in Dharwin. Bolna hosted knowledge base accepts PDF or URL, not raw text."
      >
        Local only
      </span>
    );
  }

  if (!b) {
    return (
      <span className="text-xs text-defaulttextcolor/55 leading-snug block max-w-[14rem]" title={BOLNA_MIRROR_HINT}>
        Not mirrored
      </span>
    );
  }
  if (b.error) {
    return <span className="text-xs text-danger leading-snug">{String(b.error).slice(0, 120)}</span>;
  }
  if (b.rag_id) {
    return (
      <div className="space-y-0.5">
        <div className="font-mono text-[0.65rem] select-all break-all text-defaulttextcolor">{b.rag_id}</div>
        {b.status ? (
          <div className="text-[0.65rem] text-defaulttextcolor/55">Bolna: {b.status}</div>
        ) : null}
      </div>
    );
  }
  return (
    <span className="text-xs text-defaulttextcolor/55 leading-snug block max-w-[14rem]" title={BOLNA_MIRROR_HINT}>
      Not mirrored
    </span>
  );
}

function statusPill(status: KbDocument["status"]) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "pending":
      return (
        <span className={`${base} bg-warning/15 text-warning`}>
          <i className="ri-file-upload-line" aria-hidden />
          pending
        </span>
      );
    case "processing":
      return (
        <span className={`${base} bg-primary/10 text-primary`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          processing
        </span>
      );
    case "ready":
      return (
        <span className={`${base} bg-success/15 text-success`}>
          <i className="ri-checkbox-circle-line" aria-hidden />
          ready
        </span>
      );
    case "failed":
      return (
        <span className={`${base} bg-danger/15 text-danger`}>
          <i className="ri-error-warning-line" aria-hidden />
          failed
        </span>
      );
    default:
      return <span className={base}>{status}</span>;
  }
}

export default function SettingsBolnaVoiceAgentPage() {
  const router = useRouter();
  const { permissions, permissionsLoaded, isAdministrator, isPlatformSuperUser } = useAuth();
  const hasUsersManage =
    isPlatformSuperUser || isAdministrator || hasSettingsUsersManage(permissions);

  const [agents, setAgents] = useState<VoiceAgentRow[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState("");
  const [docsByAgent, setDocsByAgent] = useState<Record<string, KbDocument[]>>({});
  const [kbBusyAgent, setKbBusyAgent] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [ingestByAgent, setIngestByAgent] = useState<
    Record<string, { pasteTitle: string; pasteText: string; testQuery: string; testAnswer: string }>
  >({});
  const [liveKbMsg, setLiveKbMsg] = useState("");

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!hasUsersManage) router.replace(ROUTES.settingsPersonalInfo);
  }, [permissionsLoaded, hasUsersManage, router]);

  const loadKb = useCallback(async () => {
    if (!hasUsersManage) return;
    setKbError("");
    setKbLoading(true);
    try {
      const { agents: rows } = await kbApi.listVoiceAgents();
      const sorted = [...rows].sort((a, b) => {
        const aC = a.name.toLowerCase().includes("candidate") ? 0 : 1;
        const bC = b.name.toLowerCase().includes("candidate") ? 0 : 1;
        return aC - bC || a.name.localeCompare(b.name);
      });
      setAgents(sorted);
      setIngestByAgent((prev) => {
        const n = { ...prev };
        for (const a of sorted) {
          if (!n[a.id]) {
            n[a.id] = { pasteTitle: "", pasteText: "", testQuery: "", testAnswer: "" };
          }
        }
        return n;
      });
      const next: Record<string, KbDocument[]> = {};
      await Promise.all(
        sorted.map(async (a) => {
          const { documents } = await kbApi.listKbDocuments(a.id);
          next[a.id] = documents.map((d) => ({ ...d, id: d.id || String(d._id) }));
        })
      );
      setDocsByAgent(next);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Failed to load knowledge bases";
      setKbError(msg);
    } finally {
      setKbLoading(false);
    }
  }, [hasUsersManage]);

  useEffect(() => {
    void loadKb();
  }, [loadKb]);

  const needsDocPoll = useMemo(() => {
    return Object.values(docsByAgent)
      .flat()
      .some((d) => d.status === "pending" || d.status === "processing");
  }, [docsByAgent]);

  useEffect(() => {
    if (!needsDocPoll || !hasUsersManage) return;
    const t = setInterval(() => {
      void loadKb();
    }, 3500);
    return () => clearInterval(t);
  }, [needsDocPoll, hasUsersManage, loadKb]);

  const toggleKb = async (agent: VoiceAgentRow, enabled: boolean) => {
    setKbBusyAgent(agent.id);
    setKbError("");
    try {
      await kbApi.patchVoiceAgent(agent.id, { knowledgeBaseEnabled: enabled });
      await loadKb();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Update failed";
      setKbError(msg);
    } finally {
      setKbBusyAgent(null);
    }
  };

  const onPdfChange = async (agentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setKbError("Please choose a PDF file.");
      input.value = "";
      return;
    }
    setKbBusyAgent(agentId);
    setUploadPct(0);
    setKbError("");
    try {
      await kbApi.uploadKbPdf(agentId, f, {
        onProgress: (p) => setUploadPct(p),
      });
      setLiveKbMsg("PDF uploaded. Processing and syncing to Bolna when enabled…");
      await loadKb();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? String((err.response?.data as { message?: string })?.message ?? err.message)
          : "Upload failed";
      setKbError(msg);
    } finally {
      input.value = "";
      setKbBusyAgent(null);
      setUploadPct(null);
    }
  };

  const patchIngest = (agentId: string, patch: Partial<(typeof ingestByAgent)[string]>) => {
    setIngestByAgent((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] ?? { pasteTitle: "", pasteText: "", testQuery: "", testAnswer: "" }),
        ...patch,
      },
    }));
  };

  const onPasteIngest = async (agentId: string) => {
    const s = ingestByAgent[agentId];
    if (!s?.pasteText.trim()) {
      setKbError("Add text to ingest.");
      return;
    }
    setKbBusyAgent(agentId);
    setKbError("");
    try {
      await kbApi.ingestKbText(agentId, { title: s.pasteTitle || undefined, text: s.pasteText });
      patchIngest(agentId, { pasteText: "", pasteTitle: "" });
      setLiveKbMsg("Text submitted for processing.");
      await loadKb();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Ingest failed";
      setKbError(msg);
    } finally {
      setKbBusyAgent(null);
    }
  };

  const onDeleteDoc = async (documentId: string) => {
    if (!confirm("Delete this document and its indexed chunks?")) return;
    setKbError("");
    try {
      await kbApi.deleteKbDocument(documentId);
      await loadKb();
      setLiveKbMsg("Document removed.");
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Delete failed";
      setKbError(msg);
    }
  };

  const runTestQuery = async (agentId: string) => {
    const s = ingestByAgent[agentId];
    if (!s?.testQuery.trim()) return;
    setKbBusyAgent(agentId);
    patchIngest(agentId, { testAnswer: "" });
    try {
      const res = await kbApi.queryKb(agentId, s.testQuery.trim());
      patchIngest(agentId, { testAnswer: res.answer });
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Query failed";
      setKbError(msg);
    } finally {
      setKbBusyAgent(null);
    }
  };

  if (!permissionsLoaded || !hasUsersManage) {
    return null;
  }

  return (
    <>
      <Seo title="Voice agent (Bolna)" />
      <div className="box-body space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-defaulttextcolor">Candidate verification voice agent</h2>
          <p className="text-sm text-defaulttextcolor/70 mt-1 max-w-3xl">
            Greeting and system prompt for outbound verification calls come from the built-in template and Bolna agent
            configuration. Use the knowledge bases below to add company-specific facts the agent can reference.
          </p>
        </div>

        <div
          className="border-l-4 border-primary rounded-md bg-light/40 dark:bg-black/10 pl-4 py-4 space-y-4 max-w-4xl"
          aria-labelledby="kb-heading"
        >
          <div>
            <h2 id="kb-heading" className="text-lg font-semibold text-defaulttextcolor">
              Voice agent knowledge bases
            </h2>
            <p className="text-sm text-defaulttextcolor/70 mt-1">
              <strong>Dharwin RAG (this portal):</strong> Turn on <strong>Knowledge base</strong> per agent and add
              documents. On each outbound call we load top-matching chunks into the agent&apos;s system prompt (seed
              retrieval). Use <strong>Test query</strong> to confirm content.{" "}
              <strong>Bolna-hosted RAG (voice pipeline):</strong> Bolna&apos;s PATCH agent API does not attach knowledge
              bases from here — after sync, link the RAG in Bolna → Agent → LLM → knowledge bases (or rely on Dharwin
              prompt injection only).
            </p>
            <p className="text-sm text-defaulttextcolor/70 mt-2">
              <strong>Choosing a PDF uploads immediately.</strong> With{" "}
              <code className="text-xs bg-light px-1 rounded">KB_BOLNA_SYNC_ENABLED=true</code>, PDFs are also mirrored
              to Bolna; the <strong>Bolna RAG</strong> column shows IDs to paste in Bolna.
            </p>
          </div>

          <div className="sr-only" aria-live="polite">
            {liveKbMsg}
          </div>
          {kbError ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{kbError}</div>
          ) : null}
          {kbLoading && agents.length === 0 ? (
            <p className="text-sm text-defaulttextcolor/70">Loading agents…</p>
          ) : null}

          {agents.map((agent) => {
            const docs = docsByAgent[agent.id] ?? [];
            const busy = kbBusyAgent === agent.id;
            const ing = ingestByAgent[agent.id] ?? {
              pasteTitle: "",
              pasteText: "",
              testQuery: "",
              testAnswer: "",
            };
            return (
              <div
                key={agent.id}
                className="rounded-md border border-defaultborder bg-bodybg p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-defaulttextcolor">{agent.name}</h3>
                    <p className="font-mono text-xs text-defaulttextcolor/60 select-all mt-0.5">
                      Bolna agent id: {agent.externalAgentId}
                    </p>
                    <p className="text-xs text-defaulttextcolor/50 mt-1">
                      {agent.knowledgeBaseSummary
                        ? `${agent.knowledgeBaseSummary.documentCount} documents · ${agent.knowledgeBaseSummary.chunkCount} chunks`
                        : "No knowledge base row yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span id={`kb-toggle-label-${agent.id}`} className="text-sm text-defaulttextcolor/80">
                      Knowledge base
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-pressed={agent.knowledgeBaseEnabled}
                      aria-labelledby={`kb-toggle-label-${agent.id}`}
                      disabled={busy}
                      onClick={() => void toggleKb(agent, !agent.knowledgeBaseEnabled)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors ${
                        agent.knowledgeBaseEnabled ? "bg-primary border-primary" : "bg-light border-defaultborder"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition translate-y-0.5 ${
                          agent.knowledgeBaseEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {!agent.knowledgeBaseEnabled ? (
                  <p className="text-sm text-defaulttextcolor/60">Enable the knowledge base to add documents.</p>
                ) : (
                  <>
                    <div className="max-w-xl">
                      <label className="form-label" htmlFor={`pdf-${agent.id}`}>
                        Upload PDF <span className="text-defaulttextcolor/60 font-normal">(starts immediately)</span>
                      </label>
                      <input
                        id={`pdf-${agent.id}`}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="form-control"
                        disabled={busy}
                        onChange={(e) => void onPdfChange(agent.id, e)}
                      />
                      {uploadPct !== null && busy ? (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-light overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-150"
                            style={{ width: `${uploadPct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label className="form-label" htmlFor={`paste-title-${agent.id}`}>
                        Paste text (optional title)
                      </label>
                      <input
                        id={`paste-title-${agent.id}`}
                        className="form-control mb-2"
                        placeholder="Title"
                        value={ing.pasteTitle}
                        disabled={busy}
                        onChange={(e) => patchIngest(agent.id, { pasteTitle: e.target.value })}
                      />
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Paste plain text…"
                        value={ing.pasteText}
                        disabled={busy}
                        onChange={(e) => patchIngest(agent.id, { pasteText: e.target.value })}
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-light mt-2"
                        disabled={busy}
                        onClick={() => void onPasteIngest(agent.id)}
                      >
                        Add text to knowledge base
                      </button>
                    </div>

                    <div>
                      <label className="form-label" htmlFor={`test-q-${agent.id}`}>
                        Test query (admin)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          id={`test-q-${agent.id}`}
                          className="form-control flex-1 min-w-[200px]"
                          placeholder="Ask a question…"
                          value={ing.testQuery}
                          disabled={busy}
                          onChange={(e) => patchIngest(agent.id, { testQuery: e.target.value })}
                        />
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary"
                          disabled={busy}
                          onClick={() => void runTestQuery(agent.id)}
                        >
                          Run
                        </button>
                      </div>
                      {ing.testAnswer ? (
                        <p className="text-sm mt-2 p-2 rounded-md bg-light border border-defaultborder whitespace-pre-wrap">
                          {ing.testAnswer}
                        </p>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto rounded-md border border-defaultborder">
                      <table className="min-w-full text-sm">
                        <thead className="bg-light/80 text-left text-defaulttextcolor/80">
                          <tr>
                            <th className="px-3 py-2 font-medium">Title / type</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th
                              className="px-3 py-2 font-medium min-w-[9rem]"
                              title="Dharwin RAG (Status) is separate. This column is Bolna’s hosted KB RAG ID when mirror sync is enabled."
                            >
                              Bolna RAG
                            </th>
                            <th className="px-3 py-2 font-medium w-24"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {docs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-defaulttextcolor/60">
                                No documents yet. Choose a PDF above or paste text.
                              </td>
                            </tr>
                          ) : (
                            docs.map((d, idx) => (
                              <tr
                                key={d.id}
                                className="border-t border-defaultborder"
                                style={{ animationDelay: `${idx * 60}ms` }}
                              >
                                <td className="px-3 py-2 align-top">
                                  <div className="font-medium">{d.title || d.type}</div>
                                  <div className="text-xs text-defaulttextcolor/50">{d.type}</div>
                                  {d.errorMessage ? (
                                    <div className="text-xs text-danger mt-1">{d.errorMessage}</div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 align-top">{statusPill(d.status)}</td>
                                <td className="px-3 py-2 align-top">{bolnaKbCell(d.metadata, d.type)}</td>
                                <td className="px-3 py-2 align-top text-end">
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-danger !py-1 !px-2 text-xs"
                                    disabled={busy}
                                    onClick={() => void onDeleteDoc(d.id)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
