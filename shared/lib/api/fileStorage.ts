"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/file-storage";

export interface FileStorageFolder {
  name: string;
  prefix: string;
}

export interface FileStorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
}

export interface ListFilesResponse {
  success: boolean;
  data: {
    folders: FileStorageFolder[];
    files: FileStorageFile[];
    nextContinuationToken: string | null;
    isTruncated: boolean;
  };
}

export interface UploadFileResponse {
  success: boolean;
  data: {
    key: string;
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  };
}

export interface DownloadUrlResponse {
  success: boolean;
  data: { url: string };
}

export async function listFiles(
  prefix?: string,
  next?: string
): Promise<ListFilesResponse["data"]> {
  const params = new URLSearchParams();
  if (prefix !== undefined && prefix !== "") params.append("prefix", prefix);
  if (next) params.append("next", next);
  const query = params.toString();
  const url = query ? `${BASE}/list?${query}` : `${BASE}/list`;
  const { data } = await apiClient.get<ListFilesResponse>(url);
  return data.data;
}

export async function uploadFile(
  file: File,
  folder?: string
): Promise<UploadFileResponse["data"]> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder !== undefined && folder !== "") formData.append("folder", folder);
  const { data } = await apiClient.post<UploadFileResponse>(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function getDownloadUrl(key: string): Promise<string> {
  const { data } = await apiClient.get<DownloadUrlResponse>(`${BASE}/download`, {
    params: { key },
  });
  return data.data.url;
}

export async function deleteFile(key: string): Promise<void> {
  await apiClient.delete(`${BASE}/object`, { params: { key } });
}

export interface CreateFolderResponse {
  success: boolean;
  data: { name: string; prefix: string };
}

export async function createFolder(
  name: string,
  prefix?: string
): Promise<CreateFolderResponse["data"]> {
  const { data } = await apiClient.post<CreateFolderResponse>(`${BASE}/folder`, {
    name,
    prefix: prefix || "",
  });
  return data.data;
}
