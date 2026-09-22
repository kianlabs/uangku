import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, API_TIMEOUT_MS } from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("apiFetch", () => {
  it("normalizes server field error arrays", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input.",
          fields: [
            { field: "amount", message: "Nominal harus lebih dari 0." },
            { field: "amount", message: "Gunakan angka." },
            { field: "category_id", message: "Pilih kategori." },
          ],
        },
      }),
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      fields: {
        amount: "Nominal harus lebih dari 0. Gunakan angka.",
        category_id: "Pilih kategori.",
      },
    });
  });

  it("melempar TIMEOUT_ERROR saat server tidak merespons dalam batas waktu", async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementationOnce(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        })
    );

    const pending = apiFetch("/api/test");
    const assertion = expect(pending).rejects.toMatchObject({
      code: "TIMEOUT_ERROR",
    });
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);
    await assertion;

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("tetap menghormati signal abort dari pemanggil", async () => {
    const userController = new AbortController();
    mockFetch.mockImplementationOnce(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const pending = apiFetch("/api/test", { signal: userController.signal });
    userController.abort();

    await expect(pending).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
