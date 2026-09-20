import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MochiTip } from "./MochiTip";

describe("MochiTip", () => {
  it("renders message with mascot", () => {
    render(<MochiTip message="Halo, aku Mochi!" />);
    expect(screen.getByText("Halo, aku Mochi!")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Maskot UangKu" })).toBeTruthy();
  });

  it("renders title and link action", () => {
    render(
      <MochiTip
        title="Hampir jebol!"
        message="Kurangi jajan ya."
        action={{ label: "Lihat", href: "/riwayat" }}
      />
    );
    expect(screen.getByText("Hampir jebol!")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat" })).toBeTruthy();
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MochiTip message="Hai" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Tutup tips" }));
    expect(onClose).toHaveBeenCalled();
  });
});
