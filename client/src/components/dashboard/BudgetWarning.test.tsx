import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetWarning } from "./BudgetWarning";

describe("BudgetWarning", () => {
  it("renders green bar below 75%", () => {
    render(<BudgetWarning spent={50} limit={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("renders amber bar at 75-90%", () => {
    render(<BudgetWarning spent={80} limit={100} />);
    expect(screen.getByText("80%")).toBeTruthy();
  });

  it("renders red bar above 90%", () => {
    render(<BudgetWarning spent={95} limit={100} />);
    expect(screen.getByText("95%")).toBeTruthy();
  });

  it("returns null when limit is zero", () => {
    const { container } = render(<BudgetWarning spent={10} limit={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when spent is null", () => {
    const { container } = render(<BudgetWarning spent={null} limit={100} />);
    expect(container.firstChild).toBeNull();
  });
});
