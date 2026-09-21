import { apiFetch, ApiResponseError } from "./api";
import type { TransactionListResponse, TransactionType } from "./types";
import { jsPDF } from "jspdf";
import { enqueueOfflineTransaction, getOfflineTransactions, replaceOfflineTransactions } from "./local-storage";

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
  try {
    return await apiFetch("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch (error) {
    if (error instanceof ApiResponseError && error.status === 0) {
      enqueueOfflineTransaction(params);
      return { offlineQueued: true };
    }
    throw error;
  }
}

export async function flushOfflineTransactions(): Promise<number> {
  const queue = getOfflineTransactions();
  if (queue.length === 0) return 0;
  const remaining = [];
  let synced = 0;
  for (const item of queue) {
    try {
      await apiFetch("/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify(item.payload),
      });
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }
  replaceOfflineTransactions(remaining);
  return synced;
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

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export async function exportTransactionsPdf(
  params: ExportTransactionsParams = {}
): Promise<{ blob: Blob; filename: string }> {
  const { blob } = await exportTransactionsCsv(params);
  const rows = parseCsvRows((await blob.text()).replace(/^\uFEFF/, ""));
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const columns = [
    { label: "Tanggal", width: 27 },
    { label: "Jenis", width: 25 },
    { label: "Kategori", width: 43 },
    { label: "Nominal", width: 34 },
    { label: "Catatan", width: pageWidth - margin * 2 - 129 },
  ];
  let y = 18;

  pdf.setTextColor(2, 70, 145);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("UangKu", margin, y);
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(11);
  pdf.text("Laporan transaksi", margin, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(110, 110, 110);
  const filterText = [
    params.type ? (params.type === "income" ? "Pemasukan" : "Pengeluaran") : "Semua transaksi",
    params.date_from ? `Dari ${params.date_from}` : "",
    params.date_to ? `Sampai ${params.date_to}` : "",
  ].filter(Boolean).join(" - ");
  pdf.text(filterText, margin, y + 13);
  y += 23;

  const drawHeader = () => {
    pdf.setFillColor(2, 70, 145);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    let x = margin;
    columns.forEach((column) => {
      pdf.text(column.label, x + 2, y + 5.2);
      x += column.width;
    });
    y += 8;
  };

  drawHeader();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  rows.slice(1).forEach((row, rowIndex) => {
    const values = [row[1] ?? "", row[2] === "income" ? "Pemasukan" : "Pengeluaran", row[3] ?? "", row[4] ?? "", row[5] ?? ""];
    const lineCount = Math.max(1, ...values.map((value, index) => pdf.splitTextToSize(value, columns[index].width - 4).length));
    const rowHeight = Math.max(7, lineCount * 3.5 + 3);
    if (y + rowHeight > pageHeight - 12) {
      pdf.addPage();
      y = 14;
      drawHeader();
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(245, 248, 250);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    let x = margin;
    pdf.setTextColor(45, 45, 45);
    values.forEach((value, index) => {
      pdf.text(pdf.splitTextToSize(value, columns[index].width - 4), x + 2, y + 4.5);
      x += columns[index].width;
    });
    y += rowHeight;
  });

  pdf.setTextColor(120, 120, 120);
  pdf.setFontSize(7);
  pdf.text(`Dibuat ${new Date().toLocaleDateString("id-ID")}`, margin, pageHeight - 7);
  return { blob: pdf.output("blob"), filename: "uangku-transaksi.pdf" };
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

