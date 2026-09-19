"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
interface MonthNavigatorProps {
  month: string;
  isCurrentMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function MonthNavigator({ month, isCurrentMonth, onPrevMonth, onNextMonth }: MonthNavigatorProps) {
  const monthDisplay = new Date(month + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between"
    >
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onPrevMonth}
        aria-label="Bulan sebelumnya"
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 active:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
      >
        <ChevronLeft className="w-5 h-5 text-slate-900" aria-hidden="true" />
      </motion.button>

      <span className="text-sm font-semibold text-slate-900">{monthDisplay}</span>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onNextMonth}
        disabled={isCurrentMonth}
        aria-label="Bulan berikutnya"
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 active:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
      >
        <ChevronRight className="w-5 h-5 text-slate-900" aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}
