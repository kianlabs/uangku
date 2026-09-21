/**
 * Sparkline 7 hari — garis SVG tulisan tangan (tanpa library chart),
 * konsisten dengan pola donut/ring yang juga ditulis manual (DESIGN.md §3E).
 * Data: nilai per hari, urut lama → baru; indeks terakhir = hari ini.
 */
export function Sparkline({ data, label }: { data: number[]; label?: string }) {
  const W = 100;
  const H = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = H - 3 - ((v - min) / range) * (H - 6);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const last = points[points.length - 1];

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-12"
        role="img"
        aria-label={label ?? "Grafik garis"}
      >
        <path d={area} className="fill-rose-500/[0.07]" />
        <path
          d={line}
          fill="none"
          className="stroke-rose-500"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {last && <circle cx={last.x} cy={last.y} r={2.5} className="fill-rose-600" />}
      </svg>
    </div>
  );
}
