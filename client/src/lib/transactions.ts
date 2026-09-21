import { apiFetch, ApiResponseError } from "./api";
import type { TransactionListResponse, TransactionType } from "./types";

export interface ListTransactionsParams {
  page?: number;
  page_size?: number;
  type?: TransactionType;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  signal?: AbortSignal;
}

export async function listTransactions(
  params: ListTransactionsParams = {}
): Promise<TransactionListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  if (params.type) q.set("type", params.type);
  if (params.category_id) q.set("category_id", params.category_id);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  const qs = q.toString();
  return apiFetch<TransactionListResponse>(`/api/v1/transactions${qs ? `?${qs}` : ""}`, {
    signal: params.signal,
  });
}

export interface CreateTransactionParams {
  type: TransactionType;
  amount: string;
  category_id: string;
  transaction_date: string;
  description?: string;
  is_opening_balance?: boolean;
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

export interface ExportTransactionsParams {
  type?: TransactionType;
  date_from?: string;
  date_to?: string;
}

export async function exportTransactionsCsv(
  params: ExportTransactionsParams = {}
): Promise<{ blob: Blob; filename: string }> {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  const qs = q.toString();
  const path = `/api/v1/export/transactions.csv${qs ? `?${qs}` : ""}`;

  let response: Response;
  try {
    response = await fetch(path, { credentials: "include" });
  } catch {
    throw new ApiResponseError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."
    );
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("uangku:unauthorized"));
    }
    let message = "Gagal mengekspor data. Coba lagi.";
    try {
      const data = await response.clone().json();
      const err = data?.error ?? data?.detail ?? {};
      if (err.message) message = err.message;
    } catch {
      // biarkan pesan default
    }
    throw new ApiResponseError(
      response.status,
      "EXPORT_FAILED",
      message
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? "uangku-transactions.csv";
  return { blob, filename };
}

export interface UpdateTransactionParams {
  type?: TransactionType;
  amount?: string;
  category_id?: string;
  transaction_date?: string;
  description?: string | null;
}

export async function updateTransaction(
  id: string,
  params: UpdateTransactionParams
) {
  return apiFetch(`/api/v1/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

