"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";
import { Button } from "@/components/ui/Button";

interface MochiTipAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface MochiTipProps {
  mood?: MascotMood;
  title?: string;
  message: string;
  action?: MochiTipAction;
  onClose?: () => void;
  className?: string;
  /** Biarkan maskot bergerak (default diam agar tidak berebut perhatian). */
  mascotAnimated?: boolean;
}

/**
 * Gelembung tips Mochi — maskot kecil + pesan + aksi opsional.
 * Dipakai untuk tips kontekstual di seluruh aplikasi.
 */
export function MochiTip({
  mood = "happy",
  title,
  message,
  action,
  onClose,
  className = "",
  mascotAnimated = false,
}: MochiTipProps) {
  return (
    <div
      className={`flex gap-3 p-4 rounded-2xl bg-surface border border-border shadow-sm ${className}`}
    >
      <Mascot size={56} mood={mood} variant="sparkle" animated={mascotAnimated} className="shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {title && (
          <p className="text-sm font-bold text-text">{title}</p>
        )}
        <p className="text-sm text-muted leading-relaxed">{message}</p>
        {action && (
          <div className="pt-1">
            {action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center justify-center h-9 px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
              >
                {action.label}
              </Link>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Tutup tips"
          className="shrink-0 flex items-center justify-center w-11 h-11 rounded-lg text-muted hover:text-text hover:bg-surface-muted active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
