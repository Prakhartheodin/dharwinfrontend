"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface ChatbotConfig {
  isGloballyEnabled: boolean;
  enabledPages: string[]; // empty = all pages enabled
}

export async function fetchChatbotSettings(): Promise<ChatbotConfig> {
  const res = await apiClient.get("/chat-assistant/settings");
  return res.data.data;
}

export async function saveChatbotSettings(config: ChatbotConfig): Promise<ChatbotConfig> {
  const res = await apiClient.put("/chat-assistant/settings", config);
  return res.data.data;
}

/** Given the current pathname and the stored config, should the chatbot FAB be visible? */
export function isChatbotEnabledForPage(pathname: string, config: ChatbotConfig | null): boolean {
  if (!config) return true; // default-open while loading
  if (!config.isGloballyEnabled) return false;
  if (config.enabledPages.length === 0) return true; // empty = all pages
  return config.enabledPages.some((p) => pathname.startsWith(p));
}
