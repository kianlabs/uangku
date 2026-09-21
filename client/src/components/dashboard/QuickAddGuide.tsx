"use client";

/**
 * Satu baris contoh format input cepat ("Catat").
 * Dipakai di QuickAddInline (yang juga tampil di dalam QuickAddModal),
 * jadi cukup satu tempat — tidak ada duplikasi teks.
 */
export function QuickAddGuide() {
  return (
    <div className="w-full max-w-sm text-center text-xs leading-relaxed text-muted">
      <p>
        <span className="font-mono text-text">kopi 20rb</span> → pengeluaran ·{" "}
        <span className="font-mono text-text">gaji 5jt</span> → pemasukan
      </p>
      <p>
        <span className="font-mono text-text">rb/k/ribu</span> = ribuan ·{" "}
        <span className="font-mono text-text">jt/juta</span> = jutaan
      </p>
    </div>
  );
}
