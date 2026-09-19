"use client";

import type { ExpenseByCategoryItem } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

interface SpendingDonutProps {
  data: ExpenseByCategoryItem[];
  monthlyExpense: string;
}

const PALETTE = [
  "oklch(35% 0.08 160)", // accent
  "oklch(45% 0.07 160)",
  "oklch(55% 0.06 160)",
  "oklch(65% 0.05 160)",
  "oklch(75% 0.04 160)",
];

// SVG murni (~30 baris path) — tanpa library chart eksternal.
function arcPath(cx: number, cy: number, rOut: number, rIn: number, start: number, end: number) {
  const sRad = ((start - 90) * Math.PI) / 180;
  const eRad = ((end - 90) * Math.PI) / 180;
  const x1 = cx + rOut * Math.cos(sRad);
  const y1 = cy + rOut * Math.sin(sRad);
  const x2 = cx + rOut * Math.cos(eRad);
  const y2 = cy + rOut * Math.sin(eRad);
  const x3 = cx + rIn * Math.cos(eRad);
  const y3 = cy + rIn * Math.sin(eRad);
  const x4 = cx + rIn * Math.cos(sRad);
  const y4 = cy + rIn * Math.sin(sRad);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

export function SpendingDonut({ data, monthlyExpense }: SpendingDonutProps) {
  const total = Number.parseFloat(monthlyExpense);
  if (!data.length || !Number.isFinite(total) || total <= 0) return null;

  const top = data.slice(0, 5).map((c) => ({
    name: c.category_name,
    amount: Number.parseFloat(c.amount),
    pct: (Number.parseFloat(c.amount) / total) * 100,
  }));

  const slices = top.reduce<{ start: number; end: number; color: string; name: string; amount: number; pct: number }[]>(
    (acc, s, i) => {
      const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
      const end = start + s.pct;
      return [...acc, { ...s, start, end, color: PALETTE[i % PALETTE.length] }];
    },
    []
  );

  return (
    <section aria-label="Pengeluaran terbesar" className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-text">Pengeluaran terbesar</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <svg
          viewBox="0 0 160 160"
          className="h-36 w-36 shrink-0"
          role="img"
          aria-label="Donut pengeluaran terbesar"
        >
          {slices.length === 1 && slices[0].pct >= 99.9 ? (
            <circle
              cx={80}
              cy={80}
              r={57}
              fill="none"
              stroke={slices[0].color}
              strokeWidth={26}
            />
          ) : (
            slices.map((s, i) => (
              <path key={i} d={arcPath(80, 80, 70, 44, s.start * 3.6, s.end * 3.6)} fill={s.color} />
            ))
          )}
          <circle cx={80} cy={80} r={42} fill="var(--color-canvas)" />
          <text
            x={80}
            y={76}
            textAnchor="middle"
            className="fill-muted"
            fontSize={9}
          >
            Total
          </text>
          <text
            x={80}
            y={92}
            textAnchor="middle"
            className="fill-text"
            fontSize={13}
            fontWeight={700}
          >
            {formatRupiah(total)}
          </text>
        </svg>
        <ul className="flex flex-col gap-2 flex-1">
          {slices.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-text">{s.name}</span>
              <span className="text-sm font-semibold text-text tabular-nums">
                {s.pct.toFixed(0)}%
              </span>
              <span className="text-sm text-muted tabular-nums whitespace-nowrap">
                {formatRupiah(s.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
