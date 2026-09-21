/**
 * preferences.ts — client untuk /api/v1/user/preferences
 *
 * Server adalah source of truth. LocalStorage dipakai sebagai cache lokal
 * agar komponen tidak perlu await setiap kali baca.
 *
 * Hydration flow (dilakukan di AuthContext setelah login/getMe):
 *   1. GET /api/v1/user/preferences
 *   2. Seed localStorage dengan nilai server
 *   3. Komponen baca dari localStorage seperti biasa
 *
 * Write flow:
 *   1. Tulis ke localStorage (sync, instant)
 *   2. PATCH ke server secara fire-and-forget (tidak block UI)
 */

import { apiFetch } from "./api";
import type { UserPreferences } from "./types";

export async function getPreferences(): Promise<UserPreferences> {
  const data = await apiFetch<{ preferences: UserPreferences }>("/api/v1/user/preferences");
  return data.preferences;
}

export async function updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
  const result = await apiFetch<{ preferences: UserPreferences }>("/api/v1/user/preferences", {
    method: "PATCH",
    body: JSON.stringify({ preferences: data }),
  });
  return result.preferences;
}
