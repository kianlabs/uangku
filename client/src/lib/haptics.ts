/**
 * Getar halus ala app native. No-op di SSR / browser tanpa dukungan.
 */
export function buzz(pattern: number | number[] = 10): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Intentional no-op: haptic tidak boleh mengganggu alur utama
  }
}

/**
 * Pola umum — dipakai lintas app biar bahasa getarnya konsisten (DESIGN.md §6):
 * tap singkat, sukses "pop" ganda, gagal getar panjang, warning dua ketukan.
 */
export const haptic = {
  tap: () => buzz(10),
  success: () => buzz([12, 40, 12]),
  error: () => buzz(40),
  warning: () => buzz([8, 60, 8]),
} as const;
