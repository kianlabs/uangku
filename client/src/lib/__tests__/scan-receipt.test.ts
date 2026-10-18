import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanReceipt } from "../transactions";
import { apiFetch } from "../api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("scanReceipt", () => {
  it("sends file as FormData and returns parsed receipt data", async () => {
    const mockResponse = {
      success: true,
      data: {
        merchant: "Indomaret Point",
        total: 58500,
        date: "2026-10-18",
        category: "Belanja",
        items: [
          { name: "Roti Gandum", qty: 1, price: 18500 },
          { name: "Susu UHT", qty: 1, price: 22000 },
          { name: "Snack Kentang", qty: 2, price: 18000 },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const file = new File(["dummy-receipt-content"], "receipt.jpg", {
      type: "image/jpeg",
    });

    const res = await scanReceipt(file);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledPath, calledOptions] = mockFetch.mock.calls[0];

    expect(calledPath).toBe("/api/v1/transactions/scan-receipt");
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.body).toBeInstanceOf(FormData);
    // Pastikan Content-Type TIDAK di-hardcode ke application/json saat kirim FormData
    expect(calledOptions.headers["Content-Type"]).toBeUndefined();

    expect(res.success).toBe(true);
    expect(res.data.merchant).toBe("Indomaret Point");
    expect(res.data.total).toBe(58500);
    expect(res.data.category).toBe("Belanja");
    expect(res.data.items).toHaveLength(3);
  });

  it("FormData in apiFetch does not have application/json header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    const fd = new FormData();
    fd.append("test", "val");

    await apiFetch("/api/test-upload", {
      method: "POST",
      body: fd,
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
  });
});
