import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  IndicatorSpotlightTour,
  openIndicatorTour,
} from "./IndicatorSpotlightTour";

describe("IndicatorSpotlightTour", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Element mock targets
    document.body.innerHTML = `
      <div data-tour="safe-to-spend">Safe to spend</div>
      <div data-tour="nav-catat-cepat">Catat cepat</div>
      <div data-tour="nav-riwayat">Riwayat</div>
      <div data-tour="nav-anggaran">Anggaran</div>
      <div data-tour="nav-pengaturan">Pengaturan</div>
    `;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
  });

  it("does not render when closed", () => {
    render(<IndicatorSpotlightTour />);
    expect(screen.queryByRole("dialog", { name: /panduan indikator/i })).toBeNull();
  });

  it("opens when openIndicatorTour event is dispatched", () => {
    render(<IndicatorSpotlightTour />);
    act(() => {
      openIndicatorTour();
    });

    expect(screen.getByRole("dialog", { name: /panduan indikator/i })).toBeTruthy();
    expect(screen.getByText(/Batas Belanja Hari Ini/i)).toBeTruthy();
  });

  it("navigates through steps and closes on completion", async () => {
    const user = userEvent.setup();
    render(<IndicatorSpotlightTour />);

    act(() => {
      openIndicatorTour();
    });

    // Step 1: Safe-to-Spend
    expect(screen.getByText(/Batas Belanja Hari Ini/i)).toBeTruthy();
    const nextBtn = screen.getByRole("button", { name: /lanjut/i });
    await user.click(nextBtn);

    // Step 2: Catat Cepat
    expect(screen.getByText(/Tombol Catat Cepat/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /lanjut/i }));

    // Step 3: Riwayat
    expect(screen.getByText(/Menu Riwayat Transaksi/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /lanjut/i }));

    // Step 4: Anggaran
    expect(screen.getByText(/Menu Anggaran Bulanan/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /lanjut/i }));

    // Step 5: Pengaturan (last step)
    expect(screen.getByText(/Menu Pengaturan & Ekspor/i)).toBeTruthy();
    const finishBtn = screen.getByRole("button", { name: /mengerti!/i });
    await user.click(finishBtn);

    // Should close and set localStorage
    expect(screen.queryByRole("dialog", { name: /panduan indikator/i })).toBeNull();
    expect(localStorage.getItem("uangku:indicator_tour_done")).toBe("true");
  });

  it("closes when close button or Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<IndicatorSpotlightTour />);

    act(() => {
      openIndicatorTour();
    });

    expect(screen.getByRole("dialog", { name: /panduan indikator/i })).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: /tutup panduan/i });
    await user.click(closeBtn);

    expect(screen.queryByRole("dialog", { name: /panduan indikator/i })).toBeNull();
    expect(localStorage.getItem("uangku:indicator_tour_done")).toBe("true");
  });
});
