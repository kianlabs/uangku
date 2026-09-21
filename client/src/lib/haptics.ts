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
