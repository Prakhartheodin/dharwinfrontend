"use client";

import { apiClient } from "@/shared/lib/api/client";

export type BlogFormat =
  | "expressive"
  | "assertive"
  | "professional"
  | "casual"
  | "informative"
  | "persuasive"
  | "neutral";

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "";

/** Generate or enhance blog content (backend OpenAI). */
export async function generateBlog(params: {
  mode: "enhance" | "generate";
  existingContent?: string;
  title?: string;
  keywords?: string;
  wordCount?: number;
  format?: BlogFormat;
}): Promise<string> {
  const { data } = await apiClient.post<{ content: string }>("/blog/generate", params);
  return data.content;
}

/** Stream generate/enhance for lower perceived latency; callbacks get partial then final HTML. */
export async function generateBlogStream(
  params: {
    mode: "enhance" | "generate";
    existingContent?: string;
    title?: string;
    keywords?: string;
    wordCount?: number;
    format?: BlogFormat;
  },
  callbacks: { onChunk?: (textSoFar: string) => void; onDone: (html: string) => void }
): Promise<string> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/v1/blog/generate-stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? "Stream request failed");
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const dec = new TextDecoder();
  let buffer = "";
  let textSoFar = "";
  let finalHtml = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as {
          chunk?: string;
          done?: boolean;
          html?: string;
          error?: string;
        };
        if (payload.error) throw new Error(payload.error);
        if (payload.chunk) {
          textSoFar += payload.chunk;
          callbacks.onChunk?.(textSoFar);
        }
        if (payload.done && payload.html != null) {
          finalHtml = payload.html;
          callbacks.onDone(payload.html);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return finalHtml;
}

/** Generate one blog from a theme (multi-blog: AI creates distinct title + content). */
export async function generateBlogFromTheme(params: {
  theme: string;
  index: number;
  total: number;
  keywords?: string;
  wordCount?: number;
  format?: BlogFormat;
}): Promise<{ title: string; content: string }> {
  const { data } = await apiClient.post<{ title: string; content: string }>(
    "/blog/generate-from-theme",
    params
  );
  return data;
}

export interface BlogSuggestionEdit {
  original: string;
  suggested: string;
  reason: string;
}

/** Get real-time suggestions (typos, spelling, small improvements). */
export async function getBlogSuggestions(params: {
  content: string;
  format?: BlogFormat;
}): Promise<{ edits: BlogSuggestionEdit[] }> {
  const { data } = await apiClient.post<{ edits: BlogSuggestionEdit[] }>(
    "/blog/suggestions",
    params
  );
  return data;
}