import { apiFetch } from "./api";
import type { BudgetListResponse } from "./types";

export async function listBudgets(month?: string): Promise<BudgetListResponse> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  return apiFetch<BudgetListResponse>(`/api/v1/budgets${qs}`);
}

export async function upsertBudget(categoryId: string, amount: string) {
  return apiFetch(`/api/v1/budgets/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify({ amount }),
  });
}

export async function deleteBudget(categoryId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/budgets/${categoryId}`, { method: "DELETE" });
}
