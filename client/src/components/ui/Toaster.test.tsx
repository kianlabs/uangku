import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toaster } from "./Toaster";
import { showToast } from "@/lib/toast";

describe("Toaster", () => {
  it("tidak tampil sebelum ada toast", () => {
    render(<Toaster />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("menampilkan toast success + bisa ditutup", () => {
    render(<Toaster />);
    act(() => {
      showToast("Transaksi tersimpan.", "success");
    });
    const box = screen.getByRole("status");
    expect(box.textContent).toContain("Transaksi tersimpan.");
    fireEvent.click(screen.getByRole("button", { name: "Tutup notifikasi" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("toast error memakai role alert", () => {
    render(<Toaster />);
    act(() => {
      showToast("Gagal menghapus.", "error");
    });
    expect(screen.getByRole("alert").textContent).toContain("Gagal menghapus.");
  });

  it("toast baru menggantikan yang lama", () => {
    render(<Toaster />);
    act(() => {
      showToast("Pertama.", "info");
      showToast("Kedua.", "info");
    });
    expect(screen.getByRole("status").textContent).toContain("Kedua.");
  });
});
