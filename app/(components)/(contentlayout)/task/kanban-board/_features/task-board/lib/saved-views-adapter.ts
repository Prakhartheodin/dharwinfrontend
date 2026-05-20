import { safeGet, safeSet } from "./safe-storage";
import { sanitizeViewName } from "./sanitize";
import {
  MAX_SAVED_VIEWS,
  SAVED_VIEWS_SIZE_CAP_BYTES,
  STORAGE_KEY_SAVED_VIEWS,
} from "./constants";
import type { SavedView, SavedViewInput } from "../types";

export interface SavedViewsAdapter {
  list(): Promise<SavedView[]>;
  create(input: SavedViewInput): Promise<SavedView>;
  update(id: string, patch: Partial<SavedViewInput>): Promise<SavedView>;
  delete(id: string): Promise<void>;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class LocalStorageAdapter implements SavedViewsAdapter {
  constructor(private userId: string) {}

  private key() {
    return STORAGE_KEY_SAVED_VIEWS(this.userId);
  }

  private read(): SavedView[] {
    return (safeGet<SavedView[]>(this.key()) ?? []).map((v) => ({
      ...v,
      source: "local" as const,
    }));
  }

  private byteSize(s: string): number {
    try {
      return new Blob([s]).size;
    } catch {
      return s.length * 2;
    }
  }

  private write(views: SavedView[]): void {
    const sorted = [...views].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    let payload = sorted;
    while (this.byteSize(JSON.stringify(payload)) > SAVED_VIEWS_SIZE_CAP_BYTES) {
      const evictIdx = [...payload].reverse().findIndex((v) => !v.pinned);
      if (evictIdx === -1) break;
      payload.splice(payload.length - 1 - evictIdx, 1);
    }
    const result = safeSet(this.key(), payload);
    if (result === "quota") {
      throw new Error("Storage quota exceeded. Delete unused views.");
    }
  }

  async list() {
    return this.read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(input: SavedViewInput) {
    const views = this.read();
    if (views.length >= MAX_SAVED_VIEWS) {
      throw new Error("Reached maximum of 50 saved views.");
    }
    const now = new Date().toISOString();
    const view: SavedView = {
      ...input,
      name: sanitizeViewName(input.name) || "Untitled view",
      id: uuid(),
      createdAt: now,
      updatedAt: now,
      source: "local",
    };
    this.write([...views, view]);
    return view;
  }

  async update(id: string, patch: Partial<SavedViewInput>) {
    const views = this.read();
    const idx = views.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error("View not found.");
    const cleaned =
      patch.name != null
        ? { ...patch, name: sanitizeViewName(patch.name) }
        : patch;
    const updated: SavedView = {
      ...views[idx],
      ...cleaned,
      updatedAt: new Date().toISOString(),
    };
    views[idx] = updated;
    this.write(views);
    return updated;
  }

  async delete(id: string) {
    this.write(this.read().filter((v) => v.id !== id));
  }
}
