import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SplashScreen } from "./SplashScreen";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SplashScreen", () => {
  it("shows mascot and wordmark on first visit", async () => {
    mockMatchMedia(false);
    render(<SplashScreen />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Maskot UangKu" })).toBeTruthy();
    });
    expect(screen.getByText("Expense Tracker")).toBeTruthy();
    expect(document.querySelector("video")).toBeNull();
  });

  it("skips when reduced motion is preferred", async () => {
    mockMatchMedia(true);
    const { container } = render(<SplashScreen />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it("skips when already seen this session", async () => {
    mockMatchMedia(false);
    sessionStorage.setItem("uangku_splash_seen", "1");
    const { container } = render(<SplashScreen />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it("dismisses on tap and remembers session", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<SplashScreen />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Maskot UangKu" })).toBeTruthy();
    });
    await user.click(screen.getByRole("status", { name: "Memuat UangKu" }));
    expect(sessionStorage.getItem("uangku_splash_seen")).toBe("1");
  });
});
