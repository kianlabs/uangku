import { apiFetch } from "./api";
import type { Category, TransactionListResponse, TransactionType } from "./types";

export interface ListTransactionsParams {
  page?: number;
  page_size?: number;
  type?: TransactionType;
  date_from?: string;
  date_to?: string;
}

export async function listTransactions(
  params: ListTransactionsParams = {}
): Promise<TransactionListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  if (params.type) q.set("type", params.type);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  const qs = q.toString();
  return apiFetch<TransactionListResponse>(`/api/v1/transactions${qs ? `?${qs}` : ""}`);
}

export interface CreateTransactionParams {
  type: TransactionType;
  amount: string;
  category_id: string;
  transaction_date: string;
  description?: string;
}

export async function createTransaction(
  params: CreateTransactionParams
) {
  return apiFetch("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/transactions/${id}`, { method: "DELETE" });
}

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
