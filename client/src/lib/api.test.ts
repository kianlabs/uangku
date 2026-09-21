import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
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
});
