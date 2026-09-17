import { apiFetch } from "./api";
import type { DashboardSummary } from "./types";

export async function getDashboardSummary(month: string): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/api/v1/dashboard/summary?month=${encodeURIComponent(month)}`);
}
