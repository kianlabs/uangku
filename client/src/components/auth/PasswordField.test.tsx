import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("renders password input with show toggle", () => {
    render(<PasswordField label="Password" />);
    expect(screen.getByLabelText("Password", { selector: "input" })).toHaveProperty(
      "type",
      "password"
    );
    expect(
      screen.getByRole("button", { name: "Tampilkan password" })
    ).toBeTruthy();
  });

  it("toggles visibility on click", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" />);
    const input = screen.getByLabelText("Password", { selector: "input" });

    await user.click(screen.getByRole("button", { name: "Tampilkan password" }));
    expect(input).toHaveProperty("type", "text");
    expect(
      screen.getByRole("button", { name: "Sembunyikan password" })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sembunyikan password" }));
    expect(input).toHaveProperty("type", "password");
  });

  it("shows error message", () => {
    render(<PasswordField label="Password" error="Password harus diisi." />);
    expect(screen.getByText("Password harus diisi.")).toBeTruthy();
  });
});
