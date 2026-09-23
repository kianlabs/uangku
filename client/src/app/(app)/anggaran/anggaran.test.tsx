import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnggaranPage from "./page";

const mockListCategories = vi.fn();
const mockListBudgets = vi.fn();
const mockUpsertBudget = vi.fn();
const mockDeleteBudget = vi.fn();

vi.mock("@/lib/categories", () => ({
  listCategories: (...args: unknown[]) => mockListCategories(...args),
}));

vi.mock("@/lib/budgets", () => ({
  listBudgets: (...args: unknown[]) => mockListBudgets(...args),
  upsertBudget: (...args: unknown[]) => mockUpsertBudget(...args),
  deleteBudget: (...args: unknown[]) => mockDeleteBudget(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AnggaranPage", () => {
  it("displays skeleton loading state initially without flashing empty state", () => {
    // Both pending
    mockListCategories.mockReturnValue(new Promise(() => {}));
    mockListBudgets.mockReturnValue(new Promise(() => {}));

    render(<AnggaranPage />);

    expect(screen.getByRole("status", { name: /memuat anggaran/i })).toBeTruthy();
    expect(screen.queryByText(/belum ada kategori pengeluaran/i)).toBeNull();
  });

  it("does not flash empty state if listBudgets resolves before listCategories", async () => {
    let resolveCategories: (val: unknown) => void = () => {};
    const catPromise = new Promise((resolve) => {
      resolveCategories = resolve;
    });

    // listCategories is slow, listBudgets resolves immediately
    mockListCategories.mockReturnValue(catPromise);
    mockListBudgets.mockResolvedValue({
      items: [],
      earliest_created_at: null,
    });

    render(<AnggaranPage />);

    // listBudgets has resolved, but categories are still pending.
    // Must STILL show loading skeleton and NEVER flash the empty state!
    expect(screen.getByRole("status", { name: /memuat anggaran/i })).toBeTruthy();
    expect(screen.queryByText(/belum ada kategori pengeluaran/i)).toBeNull();

    // Now categories resolve
    resolveCategories({
      items: [{ id: "cat-1", name: "Makan & Minum", type: "expense" }],
    });

    await waitFor(() => {
      expect(screen.getByText("Makan & Minum")).toBeTruthy();
    });

    expect(screen.queryByText(/belum ada kategori pengeluaran/i)).toBeNull();
  });

  it("renders budget rows and total summary when loaded", async () => {
    mockListCategories.mockResolvedValue({
      items: [
        { id: "c1", name: "Makanan", type: "expense" },
        { id: "c2", name: "Transportasi", type: "expense" },
        { id: "c3", name: "Gaji", type: "income" }, // income should not be in budget rows
      ],
    });
    mockListBudgets.mockResolvedValue({
      items: [
        {
          id: "b1",
          category_id: "c1",
          category_name: "Makanan",
          amount: 500000,
          spent: 250000,
          percentage: 50,
        },
      ],
      earliest_created_at: null,
    });

    render(<AnggaranPage />);

    await waitFor(() => {
      expect(screen.getByText("Makanan")).toBeTruthy();
      expect(screen.getByText("Transportasi")).toBeTruthy();
    });

    // Income category must not appear in budget rows
    expect(screen.queryByText("Gaji")).toBeNull();

    // Total budget summary
    expect(screen.getByText(/total dianggarkan/i)).toBeTruthy();
  });

  it("navigates month without replacing rows with full skeleton", async () => {
    mockListCategories.mockResolvedValue({
      items: [{ id: "c1", name: "Makanan", type: "expense" }],
    });
    mockListBudgets.mockResolvedValue({
      items: [
        {
          id: "b1",
          category_id: "c1",
          category_name: "Makanan",
          amount: 500000,
          spent: 200000,
          percentage: 40,
        },
      ],
      earliest_created_at: "2024-01-01T00:00:00Z",
    });

    const user = userEvent.setup();
    render(<AnggaranPage />);

    await waitFor(() => {
      expect(screen.getByText("Makanan")).toBeTruthy();
    });

    const prevButton = screen.getByRole("button", { name: /bulan sebelumnya/i });
    expect(prevButton).toBeTruthy();

    await user.click(prevButton);

    // List categories remain rendered, no full skeleton flicker
    expect(screen.getByText("Makanan")).toBeTruthy();
  });
});
