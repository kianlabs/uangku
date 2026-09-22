import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UangkuLogo } from "./UangkuLogo";

describe("UangkuLogo", () => {
  it("renders wordmark with accessible name", () => {
    render(<UangkuLogo />);
    expect(screen.getByRole("img", { name: "UangKu" })).toBeTruthy();
  });

  it("renders tagline", () => {
    render(<UangkuLogo />);
    expect(screen.getByText("Expense Tracker")).toBeTruthy();
  });

  it("renders mark image", () => {
    render(<UangkuLogo />);
    const img = screen.getByAltText("");
    expect(img.getAttribute("src")).toContain("logo-uangku-mark.webp");
  });

  it("renders without animation when animated is false", () => {
    render(<UangkuLogo animated={false} />);
    expect(screen.getByRole("img", { name: "UangKu" })).toBeTruthy();
  });
});
