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

    await screen.findByText("Catat semudah chat");
    await user.click(screen.getByRole("button", { name: "Oke, gampang!" }));

    await screen.findByText("Aku jagain batas harianmu");
    await user.click(screen.getByRole("button", { name: "Siap, mulai!" }));

    await waitFor(() =>
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboarding_done: true })
    );
    expect(screen.queryByText("Aku jagain batas harianmu")).toBeNull();
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
