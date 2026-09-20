import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingTour } from "./OnboardingTour";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUpdatePreferences = vi.fn(
  async (data: unknown): Promise<unknown> => data
);
vi.mock("@/lib/preferences", () => ({
  updatePreferences: (data: unknown) => mockUpdatePreferences(data),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingTour", () => {
  it("shows first step and advances", async () => {
    const user = userEvent.setup();
    render(<OnboardingTour onDone={() => {}} />);

    expect(screen.getByText("Halo! Aku Mochi!")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByText("Langkah 1: Catat transaksi")).toBeTruthy();
  });

  it("goes back to previous step", async () => {
    const user = userEvent.setup();
    render(<OnboardingTour onDone={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Kembali" }));
    expect(screen.getByText("Halo! Aku Mochi!")).toBeTruthy();
  });

  it("skipping persists flag and calls onDone", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<OnboardingTour onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Lewati panduan" }));
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboarding_done: true });
    expect(onDone).toHaveBeenCalled();
  });

  it("final CTA persists flag", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<OnboardingTour onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Catat transaksi pertama" }));
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboarding_done: true });
    expect(onDone).toHaveBeenCalled();
  });
});
