import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MochiGuide } from "./MochiGuide";

const mockGetPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();

vi.mock("@/lib/preferences", () => ({
  getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
}));

const mockListTransactions = vi.fn();
const mockCreateTransaction = vi.fn();
const mockListCategories = vi.fn();

vi.mock("@/lib/transactions", () => ({
  listTransactions: (...args: unknown[]) => mockListTransactions(...args),
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
}));

vi.mock("@/lib/categories", () => ({
  listCategories: (...args: unknown[]) => mockListCategories(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdatePreferences.mockResolvedValue({});
});

describe("MochiGuide", () => {
  it("tidak tampil kalau onboarding sudah selesai", async () => {
    mockGetPreferences.mockResolvedValue({ onboarding_done: true });
    const { container } = render(<MochiGuide />);
    await waitFor(() => expect(mockGetPreferences).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });

  it("tampil langkah pertama lalu maju sampai selesai dan persist", async () => {
    mockGetPreferences.mockResolvedValue({});
    const user = userEvent.setup();
    render(<MochiGuide />);

    await screen.findByText("Halo! Aku Mochi");
    await user.click(screen.getByRole("button", { name: "Hai Mochi!" }));

    await screen.findByText("Tanggal berapa gajian?");
    await user.click(screen.getByRole("button", { name: "Simpan & lanjut" }));

    await screen.findByText("Pegang uang berapa sekarang?");
    await user.click(screen.getByRole("button", { name: "Simpan & lanjut" }));

    await screen.findByText("Catat semudah chat");
    await user.click(screen.getByRole("button", { name: "Oke, gampang!" }));

    await screen.findByText("Aku jagain batas harianmu");
    await user.click(screen.getByRole("button", { name: "Siap, mulai!" }));

    await waitFor(() =>
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboarding_done: true })
    );
    expect(screen.queryByText("Aku jagain batas harianmu")).toBeNull();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("menolak tanggal gajian di luar 1–31", async () => {
    mockGetPreferences.mockResolvedValue({});
    const user = userEvent.setup();
    render(<MochiGuide />);

    await screen.findByText("Halo! Aku Mochi");
    await user.click(screen.getByRole("button", { name: "Hai Mochi!" }));

    const input = await screen.findByLabelText("Setiap tanggal");
    await user.clear(input);
    await user.type(input, "99");
    await user.click(screen.getByRole("button", { name: "Simpan & lanjut" }));

    expect(await screen.findByText("Isi tanggal 1–31 ya.")).toBeTruthy();
    expect(screen.queryByText("Catat semudah chat")).toBeNull();
  });

  it("mencatat saldo awal sebagai pemasukan saat diisi", async () => {
    mockGetPreferences.mockResolvedValue({});
    mockListTransactions.mockResolvedValue({ items: [] });
    mockListCategories.mockResolvedValue({
      items: [{ id: "c1", name: "Lainnya", type: "income" }],
    });
    mockCreateTransaction.mockResolvedValue({});
    const user = userEvent.setup();
    render(<MochiGuide />);

    await screen.findByText("Halo! Aku Mochi");
    await user.click(screen.getByRole("button", { name: "Hai Mochi!" }));

    await screen.findByText("Tanggal berapa gajian?");
    await user.click(screen.getByRole("button", { name: "Simpan & lanjut" }));

    await screen.findByText("Pegang uang berapa sekarang?");
    await user.type(screen.getByLabelText("Saldo saat ini (Rp)"), "5000000");
    await user.click(screen.getByRole("button", { name: "Simpan & lanjut" }));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "income",
          amount: "5000000.00",
          category_id: "c1",
          description: "Saldo awal",
        })
      )
    );
    expect(await screen.findByText("Catat semudah chat")).toBeTruthy();
  });

  it("tombol Lewati menutup dan persist", async () => {
    mockGetPreferences.mockResolvedValue({});
    const user = userEvent.setup();
    render(<MochiGuide />);

    await screen.findByText("Halo! Aku Mochi");
    await user.click(screen.getByRole("button", { name: "Lewati" }));

    await waitFor(() =>
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboarding_done: true })
    );
    expect(screen.queryByText("Halo! Aku Mochi")).toBeNull();
  });
});
