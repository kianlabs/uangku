import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleButton } from "./GoogleButton";

describe("GoogleButton", () => {
  it("renders with default label and links to /api/v1/auth/google/login", () => {
    render(<GoogleButton />);
    const link = screen.getByRole("link", { name: /masuk dengan google/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/api/v1/auth/google/login");
  });

  it("renders with custom text", () => {
    render(<GoogleButton text="Daftar dengan Google" />);
    const link = screen.getByRole("link", { name: /daftar dengan google/i });
    expect(link).toBeTruthy();
  });
});
