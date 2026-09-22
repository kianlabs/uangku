import { apiFetch } from "./api";
import type { Category, TransactionType } from "./types";

export interface ListCategoriesParams {
  type?: TransactionType;
}

export async function listCategories(
  params: ListCategoriesParams = {}
): Promise<{ items: Category[] }> {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  const qs = q.toString();
  return apiFetch<{ items: Category[] }>(`/api/v1/categories${qs ? `?${qs}` : ""}`);
}

export interface CreateCategoryParams {
  name: string;
  type: TransactionType;
}

export async function createCategory(params: CreateCategoryParams): Promise<Category> {
  return apiFetch<Category>("/api/v1/categories", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export interface UpdateCategoryParams {
  name: string;
}

export async function updateCategory(
  id: string,
  params: UpdateCategoryParams
): Promise<Category> {
  return apiFetch<Category>(`/api/v1/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/categories/${id}`, { method: "DELETE" });
}

export async function transferCategory(id: string, toCategoryId: string): Promise<{ moved: number }> {
  return apiFetch<{ moved: number }>(`/api/v1/categories/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify({ to_category_id: toCategoryId }),
  });
}
