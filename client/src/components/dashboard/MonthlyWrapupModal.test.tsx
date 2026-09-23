import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthlyWrapupModal } from "./MonthlyWrapupModal";

const mockGetDashboardSummary = vi.fn();
const mockListBudgets = vi.fn();

vi.mock("@/lib/dashboard", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
}));

vi.mock("@/lib/budgets", () => ({
  listBudgets: (...args: unknown[]) => mockListBudgets(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MonthlyWrapupModal", () => {
  it("does not render when closed", () => {
    render(<MonthlyWrapupModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders financial summary metrics and Mochi evaluation when open", async () => {
    mockGetDashboardSummary.mockResolvedValue({
      balance: "5000000",
      monthly_income: "10000000",
      monthly_expense: "4000000",
      expense_by_category: [
        { category_name: "Makanan", amount: "2500000", percentage: 62.5 },
        { category_name: "Transport", amount: "1500000", percentage: 37.5 },
      ],
      recent_transactions: [],
    });

    mockListBudgets.mockResolvedValue({
      items: [
        {
          id: "b1",
          category_id: "c1",
          category_name: "Makanan",
          amount: 3000000,
          spent: 2500000,
          percentage: 83.3,
        },
      ],
      month: "2026-09",
    });

    render(<MonthlyWrapupModal open={true} onClose={() => {}} initialMonth="2026-09" />);

    expect(screen.getByRole("dialog")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Luar Biasa Hemat!/i)).toBeTruthy();
      expect(screen.getByText(/Rp 10.000.000/i)).toBeTruthy();
      expect(screen.getByText(/Rp 4.000.000/i)).toBeTruthy();
      expect(screen.getByText(/Rp 6.000.000/i)).toBeTruthy(); // net savings
    });

    // Check top category
    expect(screen.getByText("Makanan")).toBeTruthy();
    expect(screen.getByText(/63% dari belanja/i)).toBeTruthy();

    // Check budget adherence
    expect(screen.getByText(/1 dari 1 kategori aman/i)).toBeTruthy();
  });

  it("copies summary text to clipboard when Salin Ringkasan is clicked", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    mockGetDashboardSummary.mockResolvedValue({
      balance: "5000000",
      monthly_income: "8000000",
      monthly_expense: "3000000",
      expense_by_category: [
        { category_name: "Makanan", amount: "3000000", percentage: 100 },
      ],
      recent_transactions: [],
    });

    mockListBudgets.mockResolvedValue({ items: [], month: "2026-09" });

    render(<MonthlyWrapupModal open={true} onClose={() => {}} initialMonth="2026-09" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /salin ringkasan/i })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /salin ringkasan/i }));

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("Laporan Keuangan UangKu");
    expect(copiedText).toContain("Pemasukan:");
    expect(copiedText).toContain("8.000.000");
  });

  it("disables prev and next buttons when there is no transaction in previous months", async () => {
    mockGetDashboardSummary.mockResolvedValue({
      balance: "1000000",
      monthly_income: "2000000",
      monthly_expense: "1000000",
      expense_by_category: [],
      recent_transactions: [],
      earliest_transaction_date: "2026-09-15",
    });

    mockListBudgets.mockResolvedValue({ items: [], month: "2026-09" });

    render(<MonthlyWrapupModal open={true} onClose={() => {}} initialMonth="2026-09" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /bulan sebelumnya/i })).toBeTruthy();
    });

    const prevButton = screen.getByRole("button", { name: /bulan sebelumnya/i });
    const nextButton = screen.getByRole("button", { name: /bulan berikutnya/i });

    // Karena earliest_transaction_date = 2026-09 dan initialMonth = 2026-09 (bulan saat ini):
    // Tombol < harus nonaktif (di bulan sebelumnya belum ada transaksi)
    expect(prevButton.hasAttribute("disabled")).toBe(true);
    // Tombol > harus nonaktif (sudah di bulan saat ini / terbaru)
    expect(nextButton.hasAttribute("disabled")).toBe(true);
  });
});
