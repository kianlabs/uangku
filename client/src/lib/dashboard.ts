import { apiFetch } from "./api";
import type { DashboardMetrics, DashboardSummary } from "./types";

export async function getDashboardSummary(month: string, signal?: AbortSignal): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/api/v1/dashboard/summary?month=${encodeURIComponent(month)}`, { signal });
}

export async function getDashboardMetrics(payday: number, signal?: AbortSignal): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>(`/api/v1/dashboard/metrics?payday=${payday}`, { signal });
}
