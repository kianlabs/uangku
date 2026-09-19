import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock apiFetch sebelum import preferences
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { getPreferences, updatePreferences } from "@/lib/preferences";

const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPreferences", () => {
  it("calls GET /api/v1/user/preferences and returns preferences", async () => {
    const mockPrefs = { payday: 25, tx_sources: null, debt_tags: null, templates: null };
    mockApiFetch.mockResolvedValueOnce({ preferences: mockPrefs });

    const result = await getPreferences();

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/user/preferences");
    expect(result).toEqual(mockPrefs);
  });

  it("returns empty preferences for new user", async () => {
    const mockPrefs = { payday: null, tx_sources: null, debt_tags: null, templates: null };
    mockApiFetch.mockResolvedValueOnce({ preferences: mockPrefs });

    const result = await getPreferences();
    expect(result.payday).toBeNull();
  });
});

describe("updatePreferences", () => {
  it("calls PATCH /api/v1/user/preferences with provided data", async () => {
    const updated = { payday: 15, tx_sources: null, debt_tags: null, templates: null };
    mockApiFetch.mockResolvedValueOnce({ preferences: updated });

    const result = await updatePreferences({ payday: 15 });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ preferences: { payday: 15 } }),
      })
    );
    expect(result.payday).toBe(15);
  });

  it("sends only provided keys (partial update)", async () => {
    const sources = { "tx-1": "Tunai" };
    mockApiFetch.mockResolvedValueOnce({
      preferences: { payday: null, tx_sources: sources, debt_tags: null, templates: null },
    });

    await updatePreferences({ tx_sources: sources });

    const callBody = JSON.parse((mockApiFetch.mock.calls[0][1] as RequestInit).body as string);
    // Only tx_sources should be in the payload — not payday
    expect(callBody.preferences).toHaveProperty("tx_sources");
    expect(callBody.preferences).not.toHaveProperty("payday");
  });
});
