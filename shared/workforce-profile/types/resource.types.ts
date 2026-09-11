export type UploadStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed"
  | "removed";

export type DocumentResourceMetadata = {
  url: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
};

export type DocumentResource = {
  tempId: string;
  status: UploadStatus;
  progress: number;
  file?: File;
  metadata?: DocumentResourceMetadata;
  label: string;
  type?: string;
  /** Server-owned slot stamp — preserved across document-only refresh. */
  logicalSlot?: "resume" | "cover-letter";
  slotVersion?: number;
  error?: string;
  retryCount: number;
};
