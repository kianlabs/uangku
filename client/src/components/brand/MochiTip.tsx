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
}: MochiTipProps) {
  return (
    <div
      className={`flex gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm ${className}`}
    >
      <Mascot size={56} mood={mood} animated={false} className="shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {title && (
          <p className="text-sm font-bold text-slate-900">{title}</p>
        )}
        <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
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
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
