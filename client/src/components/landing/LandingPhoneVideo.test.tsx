import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPhoneVideo } from "./LandingPhoneVideo";

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

describe("LandingPhoneVideo", () => {
  it("tidak request video (file belum ada) — tampilkan statis", () => {
    mockMatchMedia(false);
    const { container } = render(<LandingPhoneVideo />);
    expect(container.querySelector("video")).toBeNull();
    // Wrapper aria-hidden saat motion aktif — cek via alt, bukan role.
    expect(screen.getByAltText("Logo UangKu")).toBeTruthy();
  });

  it("shows static logo when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<LandingPhoneVideo />);
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByRole("img", { name: "Logo UangKu" })).toBeTruthy();
  });
});
