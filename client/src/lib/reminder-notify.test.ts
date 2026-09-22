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
import type { ReminderItem } from "./reminder-notify";

function makeItem(overrides: Partial<ReminderItem> = {}): ReminderItem {
  return {
    name: "Internet",
    amount: 150000,
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
      makeItem({ amount: 150000 }),
      makeItem({ name: "Listrik", amount: 200000 }),
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
    expect(wasNotifiedToday(["Internet"])).toBe(false);
    markNotifiedToday(["Internet"]);
    expect(wasNotifiedToday(["Internet"])).toBe(true);
    expect(wasNotifiedToday(["r1", "r2"])).toBe(false);
  });

  it("tidak mengirim saat preferensi mati / izin belum granted", async () => {
    stubNotification("default");
    await expect(showReminderNotification([makeItem()])).resolves.toBe(false);

    stubNotification("granted");
    setNotifyEnabled(false);
    await expect(showReminderNotification([makeItem()])).resolves.toBe(false);
    expect(wasNotifiedToday(["Internet"])).toBe(false);
  });

  it("mengirim via service worker bila tersedia", async () => {
    stubNotification("granted");
    const showNotification = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      serviceWorker: { controller: {}, ready: Promise.resolve({ showNotification }) },
    });

    await expect(showReminderNotification([makeItem()])).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledOnce();
    expect(wasNotifiedToday(["Internet"])).toBe(true);
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
    expect(wasNotifiedToday(["Internet"])).toBe(true);
  });
});
