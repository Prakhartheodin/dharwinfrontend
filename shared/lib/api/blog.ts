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

/** Generate or enhance blog content (backend Gemini). */
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