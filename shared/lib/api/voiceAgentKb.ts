"use client";

import { apiClient } from "@/shared/lib/api/client";

export type VoiceAgentRow = {
  id: string;
  name: string;
  externalAgentId: string;
  knowledgeBaseEnabled: boolean;
  description?: string;
  knowledgeBaseSummary?: { id: string; documentCount: number; chunkCount: number } | null;
};

/** Stored on `metadata.bolna` when KB_BOLNA_SYNC_ENABLED syncs to Bolna POST /knowledgebase */
export type KbDocumentBolnaMeta = {
  rag_id?: string;
  file_name?: string;
  source_type?: string;
  status?: string;
  error?: string | null;
  syncedAt?: string;
};

export type KbDocument = {
  id: string;
  _id?: string;
  type: "pdf" | "text" | "url";
  title?: string;
  sourceUrl?: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage?: string | null;
  metadata?: Record<string, unknown> & { bolna?: KbDocumentBolnaMeta };
  createdAt?: string;
  updatedAt?: string;
};

export async function listVoiceAgents(): Promise<{ success: boolean; agents: VoiceAgentRow[] }> {
  const { data } = await apiClient.get<{ success: boolean; agents: VoiceAgentRow[] }>("/agents");
  return data;
}

export async function patchVoiceAgent(
  agentId: string,
  body: { name?: string; knowledgeBaseEnabled?: boolean; description?: string }
): Promise<{ success: boolean; agent: VoiceAgentRow & { knowledgeBase?: { id: string; documentCount: number; chunkCount: number } } }> {
  const { data } = await apiClient.patch(`/agents/${encodeURIComponent(agentId)}`, body);
  return data;
}

export async function listKbDocuments(agentId: string): Promise<{ success: boolean; documents: KbDocument[] }> {
  const { data } = await apiClient.get<{ success: boolean; documents: KbDocument[] }>(
    `/kb/${encodeURIComponent(agentId)}/documents`
  );
  return data;
}

export async function uploadKbPdf(
  agentId: string,
  file: File,
  opts?: { title?: string; onProgress?: (pct: number) => void }
): Promise<{ success: boolean; document: KbDocument; duplicate?: boolean }> {
  const form = new FormData();
  form.append("file", file);
  if (opts?.title) form.append("title", opts.title);
  // apiClient defaults to JSON; FormData must omit Content-Type so the boundary is set correctly.
  const { data } = await apiClient.post(`/kb/${encodeURIComponent(agentId)}/documents/pdf`, form, {
    transformRequest: [
      (payload: unknown, headers: Record<string, string>) => {
        delete headers["Content-Type"];
        return payload;
      },
    ],
    onUploadProgress: (evt) => {
      if (!opts?.onProgress || !evt.total) return;
      opts.onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  } as Parameters<typeof apiClient.post>[2]);
  return data;
}

export async function ingestKbText(
  agentId: string,
  body: { title?: string; text: string }
): Promise<{ success: boolean; document: KbDocument; duplicate?: boolean }> {
  const { data } = await apiClient.post(`/kb/${encodeURIComponent(agentId)}/documents/text`, body);
  return data;
}

export async function ingestKbUrl(
  agentId: string,
  url: string
): Promise<{ success: boolean; document: KbDocument; duplicate?: boolean }> {
  const { data } = await apiClient.post(`/kb/${encodeURIComponent(agentId)}/documents/url`, { url });
  return data;
}

export async function deleteKbDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/kb/documents/${encodeURIComponent(documentId)}`);
}

export async function queryKb(
  agentId: string,
  query: string,
  includeSources?: boolean
): Promise<{
  success: boolean;
  answer: string;
  fallback?: boolean;
  cached?: boolean;
  sources?: { score: number; preview: string }[];
}> {
  const { data } = await apiClient.post("/kb/query", { agentId, query, includeSources });
  return data;
}
