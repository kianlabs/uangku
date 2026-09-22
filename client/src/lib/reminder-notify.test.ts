import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildReminderSummary,
  getNotifyPermission,
  isInsecureContext,
  isNotifyEnabled,
  markNotifiedToday,
  requestNotifyPermission,
  setNotifyEnabled,
  showReminderNotification,
  wasNotifiedToday,
} from "./reminder-notify";
import type { RecurringTransaction } from "./local-storage";

function makeItem(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: "r1",
    name: "Internet",
    amount: 150000,
    category: "Tagihan",
    day: 5,
    active: true,
    ...overrides,
  };
}

function stubNotification(permission: NotificationPermission) {
  vi.stubGlobal("Notification", {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permission),
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("reminder-notify", () => {
  it("membuat ringkasan 1 tagihan", () => {
    const summary = buildReminderSummary([makeItem()]);
    expect(summary.title).toBe("Tagihan jatuh tempo");
    expect(summary.body).toContain("Internet");
    expect(summary.body).toContain("150");
  });

  it("membuat ringkasan banyak tagihan + total", () => {
    const summary = buildReminderSummary([
      makeItem({ id: "r1", amount: 150000 }),
      makeItem({ id: "r2", name: "Listrik", amount: 200000 }),
    ]);
    expect(summary.title).toBe("2 tagihan jatuh tempo");
    expect(summary.body).toContain("350");
  });

  it("default izin unsupported tanpa Notification API", () => {
    expect(getNotifyPermission()).toBe("unsupported");
  });

  it("mendeteksi insecure context (http://IP tanpa Notification)", () => {
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    });
    expect(isInsecureContext()).toBe(true);
  });

  it("membaca permission browser", () => {
    stubNotification("granted");
    expect(getNotifyPermission()).toBe("granted");
  });

  it("requestPermission true saat granted", async () => {
    stubNotification("granted");
    await expect(requestNotifyPermission()).resolves.toBe(true);
  });

  it("preferensi default nyala, bisa dimatikan", () => {
    expect(isNotifyEnabled()).toBe(true);
    setNotifyEnabled(false);
    expect(isNotifyEnabled()).toBe(false);
  });

  it("flag sekali-sehari per tanggal + daftar id", () => {
    expect(wasNotifiedToday(["r1"])).toBe(false);
    markNotifiedToday(["r1"]);
    expect(wasNotifiedToday(["r1"])).toBe(true);
    expect(wasNotifiedToday(["r1", "r2"])).toBe(false);
  });

  it("tidak mengirim saat preferensi mati / izin belum granted", async () => {
    stubNotification("default");
    await expect(showReminderNotification([makeItem()])).resolves.toBe(false);

    stubNotification("granted");
    setNotifyEnabled(false);
    await expect(showReminderNotification([makeItem()])).resolves.toBe(false);
    expect(wasNotifiedToday(["r1"])).toBe(false);
  });

  it("mengirim via service worker bila tersedia", async () => {
    stubNotification("granted");
    const showNotification = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      serviceWorker: { controller: {}, ready: Promise.resolve({ showNotification }) },
    });

    await expect(showReminderNotification([makeItem()])).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledOnce();
    expect(wasNotifiedToday(["r1"])).toBe(true);
  });

  it("fallback ke Notification biasa tanpa service worker", async () => {
    const constructed: Array<[string, NotificationOptions?]> = [];
    function FakeNotification(title: string, options?: NotificationOptions) {
      constructed.push([title, options]);
    }
    const Fake = FakeNotification as unknown as Record<string, unknown>;
    Fake.permission = "granted";
    Fake.requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", Fake);
    vi.stubGlobal("navigator", {});

    await expect(showReminderNotification([makeItem()])).resolves.toBe(true);
    expect(constructed).toHaveLength(1);
    expect(constructed[0][0]).toBe("Tagihan jatuh tempo");
    expect(wasNotifiedToday(["r1"])).toBe(true);
  });
});
