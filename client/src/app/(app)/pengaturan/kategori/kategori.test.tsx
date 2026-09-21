import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KategoriPage from "./page";
import { ApiResponseError } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

const mockListCategories = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();

vi.mock("@/lib/categories", () => ({
  listCategories: (...args: unknown[]) => mockListCategories(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
}));

const mockListBudgets = vi.fn();
const mockUpsertBudget = vi.fn();
const mockDeleteBudget = vi.fn();

vi.mock("@/lib/budgets", () => ({
  listBudgets: (...args: unknown[]) => mockListBudgets(...args),
  upsertBudget: (...args: unknown[]) => mockUpsertBudget(...args),
  deleteBudget: (...args: unknown[]) => mockDeleteBudget(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockListBudgets.mockResolvedValue({ items: [], month: null });
});

describe("KategoriPage", () => {
  it("displays loading state initially", () => {
    const { promise } = Promise.withResolvers<{ items: never[] }>();
    mockListCategories.mockReturnValue(promise);

    render(<KategoriPage />);

    expect(screen.getByRole("status", { name: /memuat kategori/i })).toBeTruthy();
  });

  it("renders expense and income categories when loaded", async () => {
    mockListCategories.mockResolvedValue({
      items: [
        { id: "1", name: "Makan", type: "expense" },
        { id: "2", name: "Gaji", type: "income" },
        { id: "3", name: "Transport", type: "expense" },
      ],
    });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText(/pengeluaran/i)).toBeTruthy();
      expect(screen.getByText(/pemasukan/i)).toBeTruthy();
    });

    expect(screen.getByText("Makan")).toBeTruthy();
    expect(screen.getByText("Transport")).toBeTruthy();
    expect(screen.getByText("Gaji")).toBeTruthy();
  });

  it("displays empty state when no categories exist", async () => {
    mockListCategories.mockResolvedValue({
      items: [],
    });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText(/belum ada kategori/i)).toBeTruthy();
    });

    expect(screen.queryByText(/pengeluaran/i)).toBeNull();
    expect(screen.queryByText(/pemasukan/i)).toBeNull();
  });

  it("shows error state and retry button on load failure", async () => {
    mockListCategories.mockRejectedValue(
      new ApiResponseError(500, "SERVER_ERROR", "Gagal memuat kategori.")
    );

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText(/gagal memuat kategori/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /coba lagi/i })).toBeTruthy();
    });
  });

  it("retries loading categories when retry button clicked", async () => {
    mockListCategories
      .mockRejectedValueOnce(new ApiResponseError(500, "SERVER_ERROR", "Gagal memuat kategori."))
      .mockResolvedValueOnce({
        items: [{ id: "1", name: "Makan", type: "expense" }],
      });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText(/gagal memuat kategori/i)).toBeTruthy();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /coba lagi/i }));

    await waitFor(() => {
      expect(screen.getByText("Makan")).toBeTruthy();
    });

    expect(mockListCategories).toHaveBeenCalledTimes(2);
  });

  it("renders only expense categories section when only expenses exist", async () => {
    mockListCategories.mockResolvedValue({
      items: [
        { id: "1", name: "Makan", type: "expense" },
        { id: "2", name: "Transport", type: "expense" },
      ],
    });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText(/pengeluaran/i)).toBeTruthy();
    });

    expect(screen.queryByText(/pemasukan/i)).toBeNull();
    expect(screen.getByText("Makan")).toBeTruthy();
    expect(screen.getByText("Transport")).toBeTruthy();
  });

  it("renders only income categories section when only income exist", async () => {
    mockListCategories.mockResolvedValue({
      items: [
        { id: "1", name: "Gaji", type: "income" },
        { id: "2", name: "Bonus", type: "income" },
      ],
    });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText(/pemasukan/i)).toBeTruthy();
    });

    expect(screen.queryByText(/pengeluaran/i)).toBeNull();
    expect(screen.getByText("Gaji")).toBeTruthy();
    expect(screen.getByText("Bonus")).toBeTruthy();
  });

  it("shows add category form when tambah button clicked", async () => {
    mockListCategories.mockResolvedValue({
      items: [{ id: "1", name: "Makan", type: "expense" }],
    });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText("Makan")).toBeTruthy();
    });

    const user = userEvent.setup();
    const tambahButton = screen.getByRole("button", { name: /tambah/i });
    await user.click(tambahButton);

    expect(screen.getByLabelText(/nama kategori/i)).toBeTruthy();
    expect(screen.getByLabelText(/tipe/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /simpan/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /batal/i })).toBeTruthy();
  });

  it("closes add form when batal button clicked", async () => {
    mockListCategories.mockResolvedValue({
      items: [{ id: "1", name: "Makan", type: "expense" }],
    });

    render(<KategoriPage />);

    await waitFor(() => {
      expect(screen.getByText("Makan")).toBeTruthy();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /tambah/i }));

    expect(screen.getByLabelText(/nama kategori/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /batal/i }));

    expect(screen.queryByLabelText(/nama kategori/i)).toBeNull();
  });
});
