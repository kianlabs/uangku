import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecurringReminders } from "./RecurringReminders";
import {
  listRecurring,
  migrateLegacyRecurring,
  isRecurringDue,
  confirmRecurring,
  createRecurring,
} from "@/lib/recurring";
import { listCategories } from "@/lib/categories";
import type { RecurringTemplate } from "@/lib/types";

vi.mock("@/lib/recurring", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/recurring")>();
  return {
    ...mod,
    listRecurring: vi.fn(),
    migrateLegacyRecurring: vi.fn(),
    confirmRecurring: vi.fn(),
    createRecurring: vi.fn(),
    updateRecurring: vi.fn(),
    deleteRecurring: vi.fn(),
  };
});

vi.mock("@/lib/categories", () => ({
  listCategories: vi.fn(),
}));

function makeRec(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    id: "r1",
    name: "Internet",
    amount: "150000.00",
    type: "expense",
    category_id: "c1",
    category_name: "Tagihan",
    day: 1,
    active: true,
    last_confirmed: null,
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.mocked(migrateLegacyRecurring).mockResolvedValue(0);
  vi.mocked(listCategories).mockResolvedValue({ items: [] });
});

describe("RecurringReminders — server", () => {
  it("memuat daftar dari server", async () => {
    vi.mocked(listRecurring).mockResolvedValue([makeRec()]);
    render(<RecurringReminders />);
    await waitFor(() => {
      expect(screen.getByText("Internet")).toBeTruthy();
    });
    expect(screen.getByText(/tanggal 1/)).toBeTruthy();
  });

  it("menawarkan notifikasi saat ada yang jatuh tempo & izin belum dipilih", async () => {
    vi.mocked(listRecurring).mockResolvedValue([makeRec({ day: 1 })]);
    vi.stubGlobal("Notification", { permission: "default" });
    render(<RecurringReminders />);
    await waitFor(() => {
      expect(screen.getByText(/Mau diingatkan lewat notifikasi HP/)).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Nyalakan" })).toBeTruthy();
  });

  it("tidak menawarkan saat izin sudah granted", async () => {
    vi.mocked(listRecurring).mockResolvedValue([makeRec({ day: 1 })]);
    vi.stubGlobal("Notification", { permission: "granted" });
    render(<RecurringReminders />);
    await waitFor(() => {
      expect(screen.getByText("Internet")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Nyalakan" })).toBeNull();
  });

  it("confirm mencatat + dispatch tx-changed", async () => {
    const user = userEvent.setup();
    vi.mocked(listRecurring).mockResolvedValue([makeRec({ day: 1 })]);
    vi.mocked(confirmRecurring).mockResolvedValue({ id: "tx1" });
    const events: string[] = [];
    window.addEventListener("uangku:tx-changed", () => events.push("tx"));
    render(<RecurringReminders />);
    const btn = await screen.findByRole("button", { name: "Catat" });
    await user.click(btn);
    await waitFor(() => {
      expect(confirmRecurring).toHaveBeenCalledWith("r1");
    });
    expect(events).toContain("tx");
  });

  it("validasi form tampil saat nama kosong", async () => {
    const user = userEvent.setup();
    vi.mocked(listRecurring).mockResolvedValue([]);
    render(<RecurringReminders />);
    await screen.findByRole("button", { name: "Tambah pengingat" });
    await user.click(screen.getByRole("button", { name: "Tambah pengingat" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(createRecurring).not.toHaveBeenCalled();
  });
});

describe("isRecurringDue", () => {
  it("jatuh tempo setelah tanggal, sekali per bulan", () => {
    const base = { day: 20, active: true, last_confirmed: null };
    expect(isRecurringDue(base, new Date(2026, 8, 19))).toBe(false);
    expect(isRecurringDue(base, new Date(2026, 8, 20))).toBe(true);
    expect(
      isRecurringDue({ ...base, last_confirmed: "2026-09-20" }, new Date(2026, 8, 25))
    ).toBe(false);
    expect(isRecurringDue({ ...base, day: 31 }, new Date(2026, 1, 28))).toBe(true);
  });
});
