"use client";

import { useCallback, useRef } from "react";
import { uploadDocument } from "@/shared/lib/api/employees";
import type {
  DocumentResource,
  DocumentResourceMetadata,
  UploadStatus,
} from "../types/resource.types";
import { useWorkforceStore } from "../state/workforce.store";
import type { WorkforceAnalyticsApi } from "../hooks/useWorkforceAnalytics";

export type UploadFn = (
  file: File,
  label?: string,
) => Promise<DocumentResourceMetadata>;

export type UseDocumentUploadOptions = {
  analytics?: WorkforceAnalyticsApi;
  upload?: UploadFn;
  maxRetries?: number;
};

const defaultUpload: UploadFn = async (file, label) => uploadDocument(file, label);

let idCounter = 0;
function newTempId(): string {
  idCounter += 1;
  return `doc-${Date.now()}-${idCounter}`;
}

export type UseDocumentUploadReturn = {
  add: (file: File, meta?: { label?: string; type?: string }) => Promise<DocumentResource>;
  remove: (tempId: string) => void;
  retry: (tempId: string) => Promise<DocumentResource | null>;
  finalize: () => Promise<{ uploaded: number; failed: number }>;
};

export function useDocumentUpload(
  opts: UseDocumentUploadOptions = {},
): UseDocumentUploadReturn {
  const upload = opts.upload ?? defaultUpload;
  const maxRetries = opts.maxRetries ?? 3;
  const analytics = opts.analytics;

  const addDocument = useWorkforceStore((s) => s.addDocument);
  const updateDocument = useWorkforceStore((s) => s.updateDocument);
  const removeDocument = useWorkforceStore((s) => s.removeDocument);

  const inFlight = useRef<Map<string, Promise<DocumentResource>>>(new Map());

  const transition = useCallback(
    (tempId: string, patch: Partial<DocumentResource>) => {
      updateDocument(tempId, patch);
    },
    [updateDocument],
  );

  const runUpload = useCallback(
    async (resource: DocumentResource): Promise<DocumentResource> => {
      const file = resource.file;
      if (!file) {
        const failed: Partial<DocumentResource> = {
          status: "failed",
          error: "Missing file",
        };
        transition(resource.tempId, failed);
        return { ...resource, ...failed };
      }

      transition(resource.tempId, { status: "uploading", progress: 0 });
      analytics?.trackUploadStart(resource.tempId, file.type, file.size);

      try {
        const metadata = await upload(file, resource.label);
        const status: UploadStatus = "uploaded";
        transition(resource.tempId, {
          status,
          progress: 1,
          metadata,
          error: undefined,
          file: undefined,
        });
        analytics?.trackUploadSuccess(resource.tempId);
        return { ...resource, status, metadata, progress: 1 };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        const nextRetry = resource.retryCount + 1;
        transition(resource.tempId, {
          status: "failed",
          error: message,
          retryCount: nextRetry,
        });
        analytics?.trackUploadFail(resource.tempId, message, nextRetry);
        return {
          ...resource,
          status: "failed",
          error: message,
          retryCount: nextRetry,
        };
      }
    },
    [upload, transition, analytics],
  );

  const add = useCallback(
    async (
      file: File,
      meta?: { label?: string; type?: string },
    ): Promise<DocumentResource> => {
      const resource: DocumentResource = {
        tempId: newTempId(),
        status: "queued",
        progress: 0,
        file,
        label: meta?.label ?? file.name,
        type: meta?.type,
        retryCount: 0,
      };
      addDocument(resource);
      const promise = runUpload(resource);
      inFlight.current.set(resource.tempId, promise);
      try {
        return await promise;
      } finally {
        inFlight.current.delete(resource.tempId);
      }
    },
    [addDocument, runUpload],
  );

  const remove = useCallback(
    (tempId: string) => {
      removeDocument(tempId);
      inFlight.current.delete(tempId);
    },
    [removeDocument],
  );

  const retry = useCallback(
    async (tempId: string): Promise<DocumentResource | null> => {
      const docs = useWorkforceStore.getState().documents.documents;
      const current = docs.find((d) => d.tempId === tempId);
      if (!current) return null;
      if (current.retryCount >= maxRetries) {
        transition(tempId, { error: "Max retries reached" });
        return current;
      }
      const promise = runUpload(current);
      inFlight.current.set(tempId, promise);
      try {
        return await promise;
      } finally {
        inFlight.current.delete(tempId);
      }
    },
    [runUpload, transition, maxRetries],
  );

  const finalize = useCallback(async () => {
    const pending = Array.from(inFlight.current.values());
    await Promise.allSettled(pending);
    const docs = useWorkforceStore.getState().documents.documents;
    return {
      uploaded: docs.filter((d) => d.status === "uploaded").length,
      failed: docs.filter((d) => d.status === "failed").length,
    };
  }, []);

  return { add, remove, retry, finalize };
}
