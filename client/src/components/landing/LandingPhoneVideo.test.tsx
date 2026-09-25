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
  it("renders mockup frame with high quality screenshot", () => {
    mockMatchMedia(false);
    const { container } = render(<LandingPhoneVideo />);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByAltText("Screenshot aplikasi UangKu")).toBeTruthy();
    expect(screen.getByTestId("phone-mockup")).toBeTruthy();
  });

  it("handles reduced motion preference", () => {
    mockMatchMedia(true);
    const { container } = render(<LandingPhoneVideo />);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByAltText("Screenshot aplikasi UangKu")).toBeTruthy();
    expect(screen.getByTestId("phone-mockup")).toBeTruthy();
  });
});
