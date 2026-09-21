import type { ReactNode } from "react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";

interface EmptyStateProps {
  mood?: MascotMood;
  mascotSize?: number;
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Empty state ber-brand: Mochi + judul + CTA opsional.
 * Satu komponen untuk semua kondisi kosong agar konsisten (DESIGN.md §6).
 */
export function EmptyState({
  mood = "happy",
  mascotSize = 96,
  title,
  description,
  actions,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Mascot size={mascotSize} mood={mood} label="Mochi menemanimu" />
      <div className="flex flex-col gap-1 items-center max-w-xs">
        <p className="text-base font-semibold text-text">{title}</p>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap justify-center">{actions}</div>
      )}
    </div>
  );
}
