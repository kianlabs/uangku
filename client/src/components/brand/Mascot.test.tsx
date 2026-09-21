import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mascot } from "./Mascot";

describe("Mascot", () => {
  it("renders with accessible name", () => {
    render(<Mascot />);
    expect(screen.getByRole("img", { name: "Maskot UangKu" })).toBeTruthy();
  });

  it("renders custom label and size", () => {
    render(<Mascot label="Mochi si pemandu" size={96} />);
    const el = screen.getByRole("img", { name: "Mochi si pemandu" });
    expect(el.querySelector("svg")?.getAttribute("width")).toBe("96");
  });

  it("renders without animation when animated is false", () => {
    render(<Mascot animated={false} />);
    expect(screen.getByRole("img", { name: "Maskot UangKu" })).toBeTruthy();
  });

  it.each([
    "happy",
    "ok",
    "firm",
    "excited",
    "thinking",
    "worried",
    "sleepy",
    "celebrating",
  ] as const)("renders %s mood", (mood) => {
    render(<Mascot mood={mood} animated={false} />);
    expect(screen.getByRole("img", { name: "Maskot UangKu" })).toBeTruthy();
  });

  it.each(["classic", "glasses", "peace", "cap", "bow", "sparkle"] as const)(
    "renders %s variant",
    (variant) => {
      render(<Mascot variant={variant} animated={false} />);
      expect(screen.getByRole("img").querySelector("svg")?.getAttribute("data-mascot-variant")).toBe(variant);
    },
  );
});
