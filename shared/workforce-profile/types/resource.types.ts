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
  error?: string;
  retryCount: number;
};
