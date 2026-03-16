"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Number of training modules that use this category (included in list response) */
  moduleCount?: number;
}

export interface CategoriesListResponse {
  results: Category[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListCategoriesParams {
  name?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function listCategories(params?: ListCategoriesParams): Promise<CategoriesListResponse> {
  const { data } = await apiClient.get<CategoriesListResponse>("/training/categories", { params });
  return data;
}

export async function getCategory(categoryId: string): Promise<Category> {
  const { data } = await apiClient.get<Category>(`/training/categories/${categoryId}`);
  return data;
}

export interface CreateCategoryPayload {
  name: string;
}

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  const { data } = await apiClient.post<Category>("/training/categories", payload);
  return data;
}

export interface UpdateCategoryPayload {
  name?: string;
}

export async function updateCategory(categoryId: string, payload: UpdateCategoryPayload): Promise<Category> {
  const { data } = await apiClient.patch<Category>(`/training/categories/${categoryId}`, payload);
  return data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await apiClient.delete(`/training/categories/${categoryId}`);
}
