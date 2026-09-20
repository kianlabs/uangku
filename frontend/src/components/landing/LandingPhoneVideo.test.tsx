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
  it("plays portrait video by default", () => {
    mockMatchMedia(false);
    render(<LandingPhoneVideo />);
    const video = document.querySelector("video");
    expect(video?.getAttribute("src")).toBe("/videos/UangKu_motiongraph.mp4");
  });

  it("shows static logo when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<LandingPhoneVideo />);
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByRole("img", { name: "Logo UangKu" })).toBeTruthy();
  });
});
