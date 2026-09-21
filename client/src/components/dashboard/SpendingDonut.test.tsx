import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpendingDonut } from "./SpendingDonut";

// Payload asli dari GET /api/v1/dashboard/summary?month=2026-09
const REAL_DATA = [
  { category_id: "1", category_name: "Tagihan", amount: "250000.00", percentage: 42.74 },
  { category_id: "2", category_name: "Transportasi", amount: "200000.00", percentage: 34.19 },
  { category_id: "3", category_name: "Makanan", amount: "70000.00", percentage: 11.97 },
  { category_id: "4", category_name: "Belanja", amount: "65000.00", percentage: 11.11 },
];

describe("SpendingDonut", () => {
  it("renders slices for real API payload", () => {
    const { container } = render(
      <SpendingDonut data={REAL_DATA} monthlyExpense="585000.00" />
    );
    expect(screen.getByText("Tagihan")).toBeTruthy();
    expect(screen.getByText("Transportasi")).toBeTruthy();
    expect(container.querySelectorAll("svg path").length).toBeGreaterThan(0);
  });

  it("renders nothing when expense is zero", () => {
    const { container } = render(
      <SpendingDonut data={[]} monthlyExpense="0.00" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders single full circle for one category", () => {
    const { container } = render(
      <SpendingDonut
        data={[{ category_id: "1", category_name: "Makanan", amount: "45000.00", percentage: 100 }]}
        monthlyExpense="45000.00"
      />
    );
    expect(screen.getByText("Makanan")).toBeTruthy();
    expect(container.querySelector("svg circle")).toBeTruthy();
  });
});
