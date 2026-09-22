import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecurringReminders } from "./RecurringReminders";
import { saveRecurringTransactions } from "@/lib/local-storage";

function seedDueReminder() {
  // day: 1 selalu <= tanggal hari ini → jatuh tempo (belum dikonfirmasi).
  saveRecurringTransactions([
    { id: "r1", name: "Internet", amount: 150000, category: "Tagihan", day: 1, active: true },
  ]);
}

beforeEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("RecurringReminders — tawaran notifikasi", () => {
  it("menawarkan notifikasi saat ada yang jatuh tempo & izin belum dipilih", () => {
    seedDueReminder();
    vi.stubGlobal("Notification", { permission: "default" });

    render(<RecurringReminders />);

    expect(screen.getByText(/Mau diingatkan lewat notifikasi HP/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nyalakan" })).toBeTruthy();
  });

  it("tidak menawarkan saat izin sudah granted", () => {
    seedDueReminder();
    vi.stubGlobal("Notification", { permission: "granted" });

    render(<RecurringReminders />);

    expect(screen.queryByRole("button", { name: "Nyalakan" })).toBeNull();
  });

  it("tidak menawarkan saat tidak ada yang jatuh tempo", () => {
    vi.stubGlobal("Notification", { permission: "default" });

    render(<RecurringReminders />);

    expect(screen.queryByRole("button", { name: "Nyalakan" })).toBeNull();
  });

  it("klik Nyalakan meminta izin lalu tawaran hilang", async () => {
    seedDueReminder();
    const Fake: Record<string, unknown> = { permission: "default" };
    Fake.requestPermission = vi.fn().mockImplementation(async () => {
      Fake.permission = "granted";
      return "granted";
    });
    function FakeNotification() {}
    Object.setPrototypeOf(FakeNotification, Fake);
    const requestPermission = Fake.requestPermission;
    vi.stubGlobal("Notification", FakeNotification);
    vi.stubGlobal("navigator", {});

    const user = userEvent.setup();
    render(<RecurringReminders />);

    await user.click(screen.getByRole("button", { name: "Nyalakan" }));

    await waitFor(() => expect(requestPermission).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Nyalakan" })).toBeNull()
    );
  });
});
